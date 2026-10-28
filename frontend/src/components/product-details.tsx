import Changelog from "@/components/changelog";
import Maven from "@/components/maven";
import { CodeBlock } from "@/components/ui/code-block";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, H4 } from "@/components/ui/typography";
import type { ProductArtifact } from "@/data/product-types";
import type { Readme, ReadmeSections } from "@/data/readme";
import "@/translation/ui";
import type { Lang } from "@/translation/ui";
import type { TFunction } from "i18next";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
} from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { ChangelogRelease } from "../../scripts/fetch-changelog";

const getReadmeTabs = (
  t: TFunction,
): { value: keyof ReadmeSections; label: string }[] => [
  { value: "description", label: t("productDetails.tabs.description") },
  { value: "demo", label: t("productDetails.tabs.demo") },
  { value: "setup", label: t("productDetails.tabs.setup") },
  { value: "components", label: t("productDetails.tabs.components") },
];

export type MavenArtifacts = {
  artifacts: ProductArtifact[];
  mainArtifactId?: string;
  productName: string;
  version: string;
  lang: Lang;
};

export default function ProductDetails({
  readme,
  maven,
  changelog,
  lang,
}: {
  readme?: Readme;
  maven?: MavenArtifacts;
  changelog?: ChangelogRelease[];
  lang: Lang;
}) {
  const { t } = useTranslation(undefined, { lng: lang });

  const sections = readme?.sections;
  const tabs: { value: string; label: string; content: ReactNode }[] = [
    ...getReadmeTabs(t)
      .filter(({ value }) => sections?.[value])
      .map(({ value, label }) => ({
        value,
        label,
        content: (
          <Markdown
            markdown={sections![value]!}
            baseUrl={readme!.baseUrl}
            lang={lang}
          />
        ),
      })),
    ...(maven && !sections?.components
      ? [
          {
            value: "dependency",
            label: t("productDetails.tabs.dependencies.maven.title"),
            content: <Maven {...maven} lang={lang} />,
          },
        ]
      : []),
    ...(changelog?.length
      ? [
          {
            value: "changelog",
            label: t("productDetails.tabs.changelog"),
            content: <Changelog changelog={changelog} lang={lang} />,
          },
        ]
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
      className="-mt-9 w-full min-w-0 space-y-4 md:mt-0 md:space-y-12"
    >
      <TabsList variant="line" className="hidden md:flex">
        {tabs.map(({ value, label }) => (
          <TabsTrigger key={value} className="px-5.25 py-4.5" value={value}>
            <H4>{label}</H4>
          </TabsTrigger>
        ))}
      </TabsList>
      <NativeSelect
        className="w-full md:hidden [&_select]:h-10"
        value={selectedTab}
        onChange={(e) => changeTab(e.currentTarget.value)}
      >
        {tabs.map(({ value, label }) => (
          <NativeSelectOption key={value} value={value} className="w-full">
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {tabs.map(({ value, content }) => (
        <TabsContent key={value} value={value}>
          {content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function Markdown({
  markdown,
  baseUrl,
  lang,
}: {
  markdown: string;
  baseUrl: string;
  lang: Lang;
}) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        urlTransform={(url, key) => resolveUrl(url, key, baseUrl)}
        components={MARKDOWN_COMPONENTS(lang)}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

const MARKDOWN_COMPONENTS = (lang: Lang): Components => ({
  h2: ({ children }) => (
    <>
      <H4>{children}</H4>
      <Separator />
    </>
  ),
  pre: ({ node }) => (
    <CodeBlock
      className="not-prose my-4"
      code={textContent(node).replace(/\n$/, "")}
      lang={lang}
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
});

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
