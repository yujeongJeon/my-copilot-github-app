import naverpay from '@naverpay/eslint-config'

export default [
    {
        ignores: ['**/dist/*', 'node_modules'],
    },
    ...naverpay.configs.node,
    ...naverpay.configs.packageJson,
]
