import wdioEslint from '@wdio/eslint'

export default wdioEslint.config([
    {
        ignores: [
            'dist',
            'demo',
            'allure-report',
            '__mocks__',
        ]
    },
    /**
     * custom test configuration
     */
    {
        files: [
            'tests/**/*',
            'src/**/*.e2e.ts',
            'src/**/*.test.ts'
        ],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
])
