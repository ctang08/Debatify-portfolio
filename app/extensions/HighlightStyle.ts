// app/extensions/HighlightStyle.ts
import { Mark, mergeAttributes } from '@tiptap/core';

export const HighlightStyle = Mark.create({
  name: 'highlightStyle',

  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: element => {
          const style = element.getAttribute('style') || '';
          return style.includes('background-color') ? style : null;
        },
        renderHTML: attributes => {
          if (!attributes.style?.includes('background-color')) return {};
          return { style: attributes.style };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[style]',
        getAttrs: element => {
          if (!(element instanceof HTMLElement)) return false;
          const style = element.getAttribute('style') || '';
          if (/background-color/.test(style)) {
            return { style };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});
