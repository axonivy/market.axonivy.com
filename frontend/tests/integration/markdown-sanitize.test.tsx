import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "../../src/components/product-details";

function render(markdown: string, baseUrl = "/maven-products/demo/demo-product/1.0.0/") {
  return renderToStaticMarkup(
    <Markdown markdown={markdown} baseUrl={baseUrl} lang="en" />,
  );
}

describe("Markdown sanitizing", () => {
  it.each([
    ["script tag", "<script>alert(1)</script>"],
    ["inline event handler", '<img src="x.png" onerror="alert(1)">'],
    ["svg event handler", '<svg onload="alert(1)"></svg>'],
    ["iframe", '<iframe src="https://evil.example"></iframe>'],
    ["object", '<object data="https://evil.example/x.swf"></object>'],
    ["embed", '<embed src="https://evil.example/x.swf">'],
    ["style tag", "<style>body { display: none }</style>"],
    ["form", '<form action="https://evil.example"></form>'],
    [
      "meta refresh",
      '<meta http-equiv="refresh" content="0;url=https://evil.example">',
    ],
    ["base tag", '<base href="https://evil.example/">'],
  ])("removes %s", (_, html) => {
    const output = render(`before\n\n${html}\n\nafter`);
    expect(output).not.toMatch(
      /<(script|iframe|object|embed|style|form|meta|base|svg)\b/i,
    );
    expect(output).not.toMatch(/\son\w+=/i);
    expect(output).not.toContain("alert(1)");
    expect(output).toContain("before");
    expect(output).toContain("after");
  });

  it("only allows inputs as disabled task list checkboxes", () => {
    const output = render(
      '<input type="text" name="password" value="x">\n\n- [x] done',
    );
    expect(output).toMatch(
      /<input(?=[^>]*\btype="checkbox")(?=[^?]*\bdisabled\b)[^>]*>/,
    );
    expect(output).not.toMatch(/<input(?![^>]*disabled)/);
    expect(output).not.toMatch(/type="(?!checkbox)/);
    expect(output).not.toContain('name="password"');
  });

  it.each([
    ["markdown link", "[click](javascript:alert(1))"],
    ["html link", '<a href="javascript:alert(1)">click</a>'],
    ["obfuscated link", '<a href="JaVaScRiPt:alert(1)">click</a>'],
    ["entity encoded link", '<a href="&#106;avascript:alert(1)">click</a>'],
    ["vbscript link", '<a href="vbscript:msgbox(1)">click</a>'],
    [
      "data link",
      '<a href="data:text/html,<script>alert(1)</script>">click</a>',
    ],
    ["markdown image", "![x](javascript:alert(1))"],
    ["data image", '<img src="data:image/svg+xml,<svg onload=alert(1)>">'],
  ])("drops dangerous URL in %s", (_, markdown) => {
    const output = render(markdown);
    expect(output).not.toMatch(/(javascript|vbscript|data):/i);
  });

  it("prefixes ids to prevent DOM clobbering", () => {
    const output = render('<a id="__proto__" name="getElementById">x</a>');
    expect(output).not.toMatch(/\s(id|name)="(__proto__|getElementById)"/);
  });

  it("strips style attributes", () => {
    const output = render(
      '<p style="position:fixed;inset:0;background:url(https://evil.example)">x</p>',
    );
    expect(output).not.toContain("style=");
  });

  it("opens links in a new tab without opener access", () => {
    const output = render("[docs](https://example.com)");
    expect(output).toContain('href="https://example.com"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });

  it("keeps safe GitHub-flavoured content", () => {
    const output = render(
      [
        "**bold** and `code`",
        "",
        "| a | b |",
        "| - | - |",
        "| 1 | 2 |",
        "",
        "<details><summary>More</summary>hidden</details>",
        "",
        '<img src="screen1.png" alt="Screen" width="400">',
      ].join("\n"),
    );
    expect(output).toContain("<strong>bold</strong>");
    expect(output).toContain("<table>");
    expect(output).toContain("<details>");
    expect(output).toContain('src="/maven-products/demo/demo-product/1.0.0/screen1.png"');
    expect(output).toContain('width="400"');
  });
});
