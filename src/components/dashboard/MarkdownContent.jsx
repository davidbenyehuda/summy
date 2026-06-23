import React from "react";
import ReactMarkdown from "react-markdown";

export default function MarkdownContent({ children, className = "" }) {
  if (!children) return null;

  return (
    <div
      className={`markdown-content text-sm leading-relaxed space-y-3 ${className}`}
      dir="rtl"
    >
      <ReactMarkdown
        components={{
          h1: ({ children: content }) => (
            <h1 className="text-2xl font-bold mt-4 mb-2">{content}</h1>
          ),
          h2: ({ children: content }) => (
            <h2 className="text-xl font-semibold mt-4 mb-2">{content}</h2>
          ),
          h3: ({ children: content }) => (
            <h3 className="text-lg font-medium mt-3 mb-2">{content}</h3>
          ),
          p: ({ children: content }) => (
            <p className="mb-2 last:mb-0">{content}</p>
          ),
          ul: ({ children: content }) => (
            <ul className="list-disc pr-5 space-y-1 mb-2">{content}</ul>
          ),
          ol: ({ children: content }) => (
            <ol className="list-decimal pr-5 space-y-1 mb-2">{content}</ol>
          ),
          li: ({ children: content }) => <li className="mb-1">{content}</li>,
          strong: ({ children: content }) => (
            <strong className="font-semibold">{content}</strong>
          ),
          em: ({ children: content }) => <em className="italic">{content}</em>,
          code: ({ className, children: content }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className="block p-3 rounded-lg bg-white/10 text-[0.9em] font-mono overflow-x-auto">
                  {content}
                </code>
              );
            }
            return (
              <code className="px-1 py-0.5 rounded bg-white/10 text-[0.9em] font-mono">
                {content}
              </code>
            );
          },
          pre: ({ children: content }) => (
            <pre className="mb-2 overflow-x-auto">{content}</pre>
          ),
          blockquote: ({ children: content }) => (
            <blockquote className="border-r-4 border-white/20 pr-4 italic text-white/80 mb-2">
              {content}
            </blockquote>
          ),
          a: ({ href, children: content }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-300 hover:text-sky-200 underline break-all"
            >
              {content}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
