import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
} from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";
import { Base, Code, H4 } from "@/components/ui/typography";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductDependency } from "@/data/product-types";
import type { Readme, ReadmeSections } from "@/data/readme";

const README_TABS: { value: keyof ReadmeSections; label: string }[] = [
  { value: "description", label: "Description" },
  { value: "demo", label: "Demo" },
  { value: "setup", label: "Installation Guide" },
  { value: "components", label: "Components" },
];

export type MavenDependency = ProductDependency & {
  productName: string;
  version: string;
};

export default function ProductDetails({
  readme,
  maven,
}: {
  readme?: Readme;
  maven?: MavenDependency;
}) {
  const sections = readme?.sections;
  const tabs: { value: string; label: string; content: ReactNode }[] = [
    ...README_TABS.filter(({ value }) => sections?.[value]).map(
      ({ value, label }) => ({
        value,
        label,
        content: (
          <Markdown markdown={sections![value]!} baseUrl={readme!.baseUrl} />
        ),
      }),
    ),
    ...(maven && !sections?.components
      ? [{ value: "dependency", label: "Maven", content: <Maven {...maven} /> }]
      : []),
  ];
  const [selectedTab, setSelectedTab] = useState(tabs[0]?.value);

  useEffect(() => {
    if (tabs.length === 0) return;
    const selectTabFromHash = () => {
      const hash = decodeURIComponent(location.hash.slice(1));
      const isKnownTab = tabs.some(({ value }) => value === hash);
      changeTab(isKnownTab ? hash : tabs[0].value);
    };
    selectTabFromHash();
    window.addEventListener("hashchange", selectTabFromHash);
    return () => window.removeEventListener("hashchange", selectTabFromHash);
  }, []);

  function changeTab(value: string) {
    history.replaceState(history.state, "", `#${value}`);
    setSelectedTab(value);
  }

  if (tabs.length === 0) return null;

  return (
    <Tabs
      value={selectedTab}
      onValueChange={(value) => changeTab(value)}
      className="min-w-0 space-y-12"
    >
      <TabsList variant="line">
        {tabs.map(({ value, label }) => (
          <TabsTrigger key={value} className="px-6 py-5" value={value}>
            <H4>{label}</H4>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(({ value, content }) => (
        <TabsContent key={value} value={value}>
          {content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function Markdown({
  markdown,
  baseUrl,
}: {
  markdown: string;
  baseUrl: string;
}) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        urlTransform={(url, key) => resolveUrl(url, key, baseUrl)}
        components={MARKDOWN_COMPONENTS}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

const MARKDOWN_COMPONENTS: Components = {
  pre: ({ node }) => (
    <CodeBlock
      className="not-prose my-4"
      code={textContent(node).replace(/\n$/, "")}
    />
  ),
  code: ({ children }) => <Code className="not-prose">{children}</Code>,
  a: ({ href, title, children }) => (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose text-primary underline"
    >
      {children}
    </a>
  ),
};

type HastNode = { type: string; value?: string; children?: HastNode[] };

function textContent(node?: HastNode): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textContent).join("");
}

function resolveUrl(url: string, key: string, baseUrl: string): string {
  const safeUrl = defaultUrlTransform(url);
  const isRelative = !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(safeUrl);
  return key === "src" && safeUrl && isRelative
    ? baseUrl + safeUrl.replace(/^\.\//, "")
    : safeUrl;
}

function Maven({
  productName,
  groupId,
  artifactId,
  version,
  type,
}: MavenDependency) {
  const snippet = [
    `<!-- ${productName} -->`,
    "<dependency>",
    `  <groupId>${groupId}</groupId>`,
    `  <artifactId>${artifactId}</artifactId>`,
    `  <version>${version}</version>`,
    `  <type>${type}</type>`,
    "</dependency>",
  ].join("\n");

  return (
    <div className="space-y-4">
      <Base>
        You can consume it as maven artifact in your <Code>pom.xml</Code>
      </Base>
      <CodeBlock code={snippet} />
    </div>
  );
}
