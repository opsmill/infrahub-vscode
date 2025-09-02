"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReferenceLink;
const Link_1 = __importDefault(require("@docusaurus/Link"));
function ReferenceLink({ title, url, openInNewTab }) {
    return (<Link_1.default to={url} autoAddBaseUrl {...openInNewTab && { target: "_blank" }} className="flex justify-between pagination-nav__link margin-bottom--md">
      <span>{title}</span>
      <span>{url}</span>
    </Link_1.default>);
}
;
//# sourceMappingURL=index.js.map