import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders text containing inline ($...$) and block ($$...$$) LaTeX math using KaTeX.
 */
export default function MathText({ text }) {
  if (!text) return null;

  const parts = String(text).split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          return (
            <span
              key={i}
              className="math-block"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(math, { displayMode: true, throwOnError: false }),
              }}
            />
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(math, { displayMode: false, throwOnError: false }),
              }}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
