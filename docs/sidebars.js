"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sidebars = {
    vscodeSidebar: [
        'index',
        {
            type: 'category',
            label: 'Tutorials',
            collapsed: false,
            items: [
                'tutorials/getting-started',
            ],
        },
        {
            type: 'category',
            label: 'How-to Guides',
            collapsed: false,
            items: [
                'guides/configure-multiple-servers',
                'guides/execute-graphql-queries',
                'guides/manage-branches',
                'guides/snippets',
            ],
        },
        {
            type: 'category',
            label: 'Topics',
            collapsed: false,
            items: [
                'topics/extension-architecture',
                'topics/schema-validation',
            ],
        },
        {
            type: 'category',
            label: 'Reference',
            collapsed: false,
            items: [
                'reference/commands-settings',
            ],
        },
    ]
};
exports.default = sidebars;
//# sourceMappingURL=sidebars.js.map