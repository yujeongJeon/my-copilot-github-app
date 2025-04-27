import {App, Octokit} from 'octokit'
import jwt from 'jsonwebtoken'
import {createAppAuth} from '@octokit/auth-app'
import OpenAI from 'openai'

class JwtGenerator {
    static generate({appId, privateKey}: {appId: string; privateKey: string}) {
        /**
         * @type {payload}
         * @property {string} iss   APP ID
         * @property {number} iat	JWT 생성 시간. Unix time으로 나타내며, 단위는 초(sec)
         * @property {number} exp	JWT 만료 시간. Unix time으로 나타내며, 단위는 초(sec)
         */
        return jwt.sign(
            {
                iss: appId,
                iat: Math.floor(Date.now() / 1000), // 현재 시간
                exp: Math.floor(Date.now() / 1000) + 10 * 60, // 만료 시간 (10분 후)
            },
            privateKey,
            {algorithm: 'RS256'},
        )
    }
}

export const getAppOctokit = () => {
    if (!process.env.APP_ID || !process.env.PRIVATE_KEY) {
        throw new TypeError('process.env.APP_ID, process.env.PRIVATE_KEY가 필요합니다.')
    }

    const metadata = {
        appId: process.env.APP_ID,
        privateKey: process.env.PRIVATE_KEY,
    }

    const octokit = new App(metadata).octokit

    const jwtToken = JwtGenerator.generate(metadata)

    // 공통 설정
    octokit.hook.before('request', async (options) => {
        options.headers.authorization = `Bearer ${jwtToken}`
    })

    return octokit
}

export const getOctokit = (accessToken: string) => {
    return new Octokit({
        auth: accessToken,
    })
}

export const getAppInstallations = async () => {
    const appOctokit = getAppOctokit()

    const installationsResponse = await appOctokit.rest.apps.listInstallations()

    const settledResponse = await Promise.allSettled(
        installationsResponse.data.map(async ({id: installationId}) => {
            const accessTokenResponse = await appOctokit.rest.apps.createInstallationAccessToken({
                installation_id: installationId,
            })

            const accessToken = accessTokenResponse.data?.token

            if (!accessToken) {
                return []
            }

            const octokit = getOctokit(accessToken)

            try {
                const iterator = octokit.paginate.iterator('GET /installation/repositories')

                const repositories: {
                    name: string
                    full_name: string
                    accessToken: string
                    owner: {
                        login: string
                    }
                    installationId: number
                }[] = []

                for await (const {data: repositoriesData} of iterator) {
                    repositoriesData.forEach(
                        (repo) =>
                            repo &&
                            repositories.push({
                                name: repo.name,
                                full_name: repo.full_name,
                                accessToken,
                                owner: repo.owner,
                                installationId,
                            }),
                    )
                }

                return repositories
            } catch (error) {
                // IGNORE
                return []
            }
        }),
    )

    return settledResponse
        .map(getSettledResult)
        .filter((data): data is NonNullable<typeof data> => !!data)
        .flat()
}

const getSettledResult = <T>(response: PromiseSettledResult<Required<T>>) => {
    switch (response.status) {
        case 'fulfilled':
            return response.value
        case 'rejected':
        default:
            return null
    }
}

export const getInstallationOctokit = (installationId: number) => {
    if (!process.env.APP_ID || !process.env.PRIVATE_KEY) {
        throw new TypeError('process.env.APP_ID, process.env.PRIVATE_KEY가 필요합니다.')
    }

    const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: process.env.APP_ID,
            privateKey: process.env.PRIVATE_KEY,
            installationId,
        },
    })

    return octokit
}

export const getOpenAI = () => {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

    const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
        timeout: 3000,
    })

    return openai
}
