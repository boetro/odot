"use client";

import { useCallback, useEffect, useRef, useId } from "react";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser, DOMSerializer } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { exampleSetup } from "prosemirror-example-setup";
import { keymap } from "prosemirror-keymap";
import {
  inputRules,
  wrappingInputRule,
  InputRule,
} from "prosemirror-inputrules";

import { cn } from "@/lib/utils";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import TurndownService from "turndown";

const markdownToHtml = async (markdown: string): Promise<string> => {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
};

const turndownService = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

// Add custom rule for checkbox list items
turndownService.addRule("checkboxListItem", {
  filter: function (node) {
    return (
      node.nodeName === "LI" &&
      node.classList.contains("checkbox-item") &&
      node.querySelector('input[type="checkbox"]')
    );
  },
  replacement: function (content, node) {
    const checkbox = node.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    const isChecked = checkbox && checkbox.checked;
    const checkboxMark = isChecked ? "[x]" : "[ ]";

    // Get the content from the checkbox-content div if it exists
    const contentDiv = node.querySelector(".checkbox-content");
    const actualContent = contentDiv ? contentDiv.textContent || "" : content;

    return "- " + checkboxMark + " " + actualContent.trim() + "\n";
  },
});

const htmlToMarkdown = (html: string): string => {
  return turndownService.turndown(html);
};

const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block")
    .update("heading", {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      defining: true,
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
        { tag: "h4", attrs: { level: 4 } },
        { tag: "h5", attrs: { level: 5 } },
        { tag: "h6", attrs: { level: 6 } },
      ],
      toDOM(node) {
        return [`h${node.attrs.level}`, 0];
      },
    })
    .addToEnd("code_block", {
      content: "text*",
      marks: "",
      group: "block",
      code: true,
      defining: true,
      parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
      toDOM() {
        return ["pre", ["code", 0]];
      },
    })
    .update("list_item", {
      attrs: { checked: { default: null } },
      content: "paragraph block*",
      defining: true,
      parseDOM: [
        {
          tag: "li",
          getAttrs(dom: any) {
            const checkbox = dom.querySelector('input[type="checkbox"]');
            return checkbox ? { checked: checkbox.checked } : { checked: null };
          },
        },
      ],
      toDOM(node) {
        const attrs: any = {};
        if (node.attrs.checked !== null) {
          const isDark = document.documentElement.classList.contains("dark");
          return [
            "li",
            { class: "checkbox-item" },
            [
              "div",
              { class: "flex items-start -ml-6" },
              [
                "input",
                {
                  type: "checkbox",
                  checked: node.attrs.checked ? "checked" : null,
                  class:
                    "mr-2 mt-1 w-4 h-4 rounded accent-primary outline-none",
                  style: `color-scheme: ${isDark ? "dark" : "light"}`,
                },
              ],
              ["div", { class: "checkbox-content" }, 0],
            ],
          ];
        }
        return ["li", attrs, 0];
      },
    }),
  marks: schema.spec.marks,
});

const createMarkdownInputRules = (schema: Schema) => {
  const rules = [];

  // Heading rules: # -> h1, ## -> h2, ### -> h3, etc.
  for (let i = 1; i <= 6; i++) {
    rules.push(
      new InputRule(new RegExp(`^#{${i}}\\s$`), (state, match, start, end) => {
        const { tr } = state;
        const headingType = schema.nodes.heading;
        const paragraphType = schema.nodes.paragraph;

        if (headingType && paragraphType) {
          // Delete the input text
          tr.delete(start, end);

          // Create heading node
          const heading = headingType.create({ level: i });

          // Replace current block with heading
          const $from = tr.doc.resolve(start);
          const nodes = [heading];

          // Only add empty paragraph if there are no nodes after this one
          const isLastNode = $from.after() === tr.doc.content.size;
          if (isLastNode) {
            const emptyParagraph = paragraphType.create();
            nodes.push(emptyParagraph);
          }

          tr.replaceWith($from.before(), $from.after(), nodes);

          // Position cursor in the heading
          const headingStart = $from.before() + 1;
          tr.setSelection(TextSelection.near(tr.doc.resolve(headingStart)));

          return tr;
        }
        return null;
      }),
    );
  }

  // Blockquote rule: > -> blockquote
  rules.push(wrappingInputRule(/^>\s$/, schema.nodes.blockquote));

  // Bullet list rule: - or * -> bullet list
  rules.push(wrappingInputRule(/^[-*]\s$/, schema.nodes.bullet_list));

  // Ordered list rule: 1. -> ordered list
  rules.push(wrappingInputRule(/^1\.\s$/, schema.nodes.ordered_list));

  // Add code block rule: \`\`\` -> code block
  rules.push(
    new InputRule(/^```\s$/, (state, match, start, end) => {
      const { tr } = state;
      const codeBlockType = schema.nodes.code_block;
      const paragraphType = schema.nodes.paragraph;

      if (codeBlockType && paragraphType) {
        // Delete the input text
        tr.delete(start, end);

        // Create code block node
        const codeBlock = codeBlockType.create();

        // Replace current block with code block
        const $from = tr.doc.resolve(start);
        const nodes = [codeBlock];

        // Only add empty paragraph if there are no nodes after this one
        const isLastNode = $from.after() === tr.doc.content.size;
        if (isLastNode) {
          const emptyParagraph = paragraphType.create();
          nodes.push(emptyParagraph);
        }

        tr.replaceWith($from.before(), $from.after(), nodes);

        // Position cursor in the code block
        const codeBlockStart = $from.before() + 1;
        tr.setSelection(TextSelection.near(tr.doc.resolve(codeBlockStart)));

        return tr;
      }
      return null;
    }),
  );

  // Bold rule: **text** -> bold
  rules.push(
    new InputRule(/\*\*([^*]+)\*\*$/, (state, match, start, end) => {
      const { tr } = state;
      const markType = schema.marks.strong;
      if (markType) {
        tr.delete(start, end);
        tr.insertText(match[1], start);
        tr.addMark(start, start + match[1].length, markType.create());
        // Remove the mark from the cursor position to prevent continuation
        tr.removeStoredMark(markType);
        return tr;
      }
      return null;
    }),
  );

  // Bold rule alternative: __text__ -> bold
  rules.push(
    new InputRule(/__([^_]+)__$/, (state, match, start, end) => {
      const { tr } = state;
      const markType = schema.marks.strong;
      if (markType) {
        tr.delete(start, end);
        tr.insertText(match[1], start);
        tr.addMark(start, start + match[1].length, markType.create());
        // Remove the mark from the cursor position to prevent continuation
        tr.removeStoredMark(markType);
        return tr;
      }
      return null;
    }),
  );

  // Italic rule: *text* -> italic
  rules.push(
    new InputRule(/(?<!\*)\*([^*]+)\*$/, (state, match, start, end) => {
      const { tr } = state;
      const markType = schema.marks.em;
      if (markType) {
        tr.delete(start, end);
        tr.insertText(match[1], start);
        tr.addMark(start, start + match[1].length, markType.create());
        // Remove the mark from the cursor position to prevent continuation
        tr.removeStoredMark(markType);
        return tr;
      }
      return null;
    }),
  );

  // Italic rule alternative: _text_ -> italic
  rules.push(
    new InputRule(/(?<!_)_([^_]+)_$/, (state, match, start, end) => {
      const { tr } = state;
      const markType = schema.marks.em;
      if (markType) {
        tr.delete(start, end);
        tr.insertText(match[1], start);
        tr.addMark(start, start + match[1].length, markType.create());
        // Remove the mark from the cursor position to prevent continuation
        tr.removeStoredMark(markType);
        return tr;
      }
      return null;
    }),
  );

  rules.push(
    new InputRule(/\[\]\s$/, (state, match, start, end) => {
      const { tr } = state;
      const $from = tr.doc.resolve(start);

      // Check if we're in a list item
      let listItemNode = null;
      let listItemPos = null;

      for (let depth = $from.depth; depth >= 0; depth--) {
        const node = $from.node(depth);
        if (node.type === schema.nodes.list_item) {
          listItemNode = node;
          listItemPos = $from.start(depth) - 1;
          break;
        }
      }

      if (listItemNode && listItemPos !== null) {
        // Delete the input text
        tr.delete(start, end);

        // Convert the list item to a checkbox item
        tr.setNodeMarkup(listItemPos, undefined, {
          ...listItemNode.attrs,
          checked: false,
        });

        return tr;
      }

      return null;
    }),
  );

  rules.push(
    new InputRule(/\[\]\s$/, (state, match, start, end) => {
      const { tr } = state;
      const $from = tr.doc.resolve(start);

      // Check if we're in a list item
      let listItemNode = null;
      let listItemPos = null;

      for (let depth = $from.depth; depth >= 0; depth--) {
        const node = $from.node(depth);
        if (node.type === schema.nodes.list_item) {
          listItemNode = node;
          listItemPos = $from.start(depth) - 1;
          break;
        }
      }

      if (listItemNode && listItemPos !== null) {
        // Delete the input text
        tr.delete(start, end);

        // Convert the list item to a checkbox item
        tr.setNodeMarkup(listItemPos, undefined, {
          ...listItemNode.attrs,
          checked: false,
        });

        return tr;
      }

      return null;
    }),
  );

  rules.push(
    new InputRule(/\[x\]\s$/, (state, match, start, end) => {
      const { tr } = state;
      const $from = tr.doc.resolve(start);

      // Check if we're in a checkbox list item
      let listItemNode = null;
      let listItemPos = null;

      for (let depth = $from.depth; depth >= 0; depth--) {
        const node = $from.node(depth);
        if (
          node.type === schema.nodes.list_item &&
          node.attrs.checked !== null
        ) {
          listItemNode = node;
          listItemPos = $from.start(depth) - 1;
          break;
        }
      }

      if (listItemNode && listItemPos !== null) {
        // Delete the input text
        tr.delete(start, end);

        // Toggle the checkbox state
        tr.setNodeMarkup(listItemPos, undefined, {
          ...listItemNode.attrs,
          checked: true,
        });

        return tr;
      }

      return null;
    }),
  );

  return inputRules({ rules });
};

const createBackspaceKeymap = (schema: Schema) => {
  return keymap({
    Backspace: (state, dispatch) => {
      const { $from, $to } = state.selection;

      if (!state.selection.empty) {
        return false; // Let default deletion handle selected text
      }

      const node = $from.parent;

      if (
        (node.type === schema.nodes.heading ||
          node.type === schema.nodes.code_block) &&
        node.textContent === ""
      ) {
        if (dispatch) {
          const tr = state.tr.setBlockType(
            $from.before(),
            $from.after(),
            schema.nodes.paragraph,
          );
          dispatch(tr);
        }
        return true;
      }

      if ($from.pos === $to.pos && $from.pos > 0) {
        const $before = state.doc.resolve($from.pos - 1);
        const beforeChar = state.doc.textBetween($from.pos - 1, $from.pos);
        const marks = $before.marks();

        if (marks.length > 0 && beforeChar.trim() !== "") {
          // Check if we're at the very end of a marked range (no more marked text ahead)
          const $after = state.doc.resolve($from.pos);
          const afterMarks = $after.marks();

          // Only remove marks if we're at the boundary AND the next position has fewer marks
          // This prevents interference with normal text deletion
          const isAtMarkBoundary = marks.length > afterMarks.length;

          if (isAtMarkBoundary) {
            // Additional check: only trigger if the previous character is the last character of the marked text
            let isLastCharOfMark = true;
            for (
              let i = $from.pos;
              i < node.content.size + $from.start();
              i++
            ) {
              const $pos = state.doc.resolve(i);
              if ($pos.marks().some((mark) => marks.find((m) => m.eq(mark)))) {
                isLastCharOfMark = false;
                break;
              }
            }

            if (isLastCharOfMark) {
              if (dispatch) {
                const tr = state.tr;
                // Remove all marks from the character before cursor
                marks.forEach((mark) => {
                  tr.removeMark($from.pos - 1, $from.pos, mark);
                });
                dispatch(tr);
              }
              return true;
            }
          }
        }
      }

      return false; // Let default backspace behavior handle everything else
    },
    "Mod-Backspace": (state, dispatch) => {
      const { $from } = state.selection;

      // If there's a selection, let default behavior handle it
      if (!state.selection.empty) {
        return false;
      }

      const nodeStart = $from.start();
      const nodeEnd = $from.end();

      if (dispatch) {
        const tr = state.tr.delete(nodeStart, nodeEnd);
        dispatch(tr);
      }
      return true;
    },
  });
};

interface ProseMirrorEditorProps {
  placeholder?: string;
  className?: string;
  onChange?: (content: string) => void;
  initialMarkdown?: string;
  setMarkdown?: (markdown: string) => void;
}

export function ProseMirrorEditor({
  placeholder = "Start typing...",
  className,
  onChange,
  initialMarkdown = "",
  setMarkdown,
}: ProseMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const hasChangedRef = useRef(false);

  const updatePlaceholder = useCallback(
    (view: EditorView) => {
      const isEmpty =
        view.state.doc.content.childCount <= 0 ||
        (view.state.doc.content.childCount === 1 &&
          view.state.doc.content.content[0].type.name === "paragraph" &&
          view.state.doc.textContent.length === 0);
      const placeholderElement =
        editorRef.current?.querySelector(".placeholder");

      if (isEmpty) {
        if (!placeholderElement) {
          const placeholderDiv = document.createElement("div");
          placeholderDiv.className =
            "placeholder absolute top-0 left-0 text-muted-foreground pointer-events-none select-none";
          placeholderDiv.textContent = placeholder;
          editorRef.current?.appendChild(placeholderDiv);
        }
      } else {
        placeholderElement?.remove();
      }
    },
    [placeholder],
  );

  const handleBlur = useCallback(() => {
    if (hasChangedRef.current && setMarkdown && viewRef.current) {
      const fragment = DOMSerializer.fromSchema(mySchema).serializeFragment(
        viewRef.current.state.doc.content,
      );
      const div = document.createElement("div");
      div.appendChild(fragment);
      const markdown = htmlToMarkdown(div.innerHTML);
      setMarkdown(markdown);
      hasChangedRef.current = false;
    }
  }, [setMarkdown]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Destroy existing editor first
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    let cancelled = false;

    const initializeEditor = async () => {
      // Create initial document
      let doc;
      if (initialMarkdown) {
        const html = await markdownToHtml(initialMarkdown);

        // Check if component was unmounted during async operation
        if (cancelled) return;

        const element = document.createElement("div");
        element.innerHTML = html;
        doc = DOMParser.fromSchema(mySchema).parse(element);
      } else {
        doc = mySchema.nodes.doc.create(mySchema.nodes.paragraph.create());
      }

      // Check again if component was unmounted
      if (cancelled || !editorRef.current) return;

      const plugins = [
        createMarkdownInputRules(mySchema),
        ...exampleSetup({ schema: mySchema, menuBar: false }),
        createBackspaceKeymap(mySchema),
      ];

      // Create editor state
      const state = EditorState.create({
        doc,
        plugins,
      });

      // Create editor view
      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(transaction) {
          const newState = view.state.apply(transaction);
          view.updateState(newState);

          // Track that content has changed
          if (transaction.docChanged) {
            hasChangedRef.current = true;
          }

          updatePlaceholder(view);

          // Call onChange callback with HTML content
          if (onChange) {
            const fragment = DOMSerializer.fromSchema(
              mySchema,
            ).serializeFragment(newState.doc.content);
            const div = document.createElement("div");
            div.appendChild(fragment);
            onChange(div.innerHTML);
          }
        },
        handleClickOn(view, pos, node, nodePos, event) {
          if (
            node.type === mySchema.nodes.list_item &&
            node.attrs.checked !== null
          ) {
            const target = event.target as HTMLElement;
            if (
              target.type === "checkbox" ||
              target.closest(".checkbox-input")
            ) {
              const tr = view.state.tr;
              const newChecked = !node.attrs.checked;
              tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                checked: newChecked,
              });
              view.dispatch(tr);

              // Trigger save immediately on checkbox change
              if (setMarkdown) {
                setTimeout(() => {
                  const fragment = DOMSerializer.fromSchema(
                    mySchema,
                  ).serializeFragment(view.state.doc.content);
                  const div = document.createElement("div");
                  div.appendChild(fragment);
                  const markdown = htmlToMarkdown(div.innerHTML);
                  setMarkdown(markdown);
                }, 0);
              }

              return true;
            }
          }
          return false;
        },
        attributes: {
          id: `prosemirror-editor`,
          class:
            "prose prose-sm dark:prose-invert max-w-none focus:outline-none [&_li_p]:m-0 prose-li:m-0 prose-pre:bg-muted prose-p:m-0",
        },
        handleDOMEvents: {
          blur: () => {
            handleBlur();
            return false;
          },
        },
      });

      viewRef.current = view;
      updatePlaceholder(view);
    };

    initializeEditor();

    return () => {
      cancelled = true;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [
    initialMarkdown,
    onChange,
    placeholder,
    updatePlaceholder,
    handleBlur,
    setMarkdown,
  ]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={editorRef}
        className="min-h-[80px] text-sm leading-relaxed max-w-none whitespace-pre-wrap"
      />
    </div>
  );
}
