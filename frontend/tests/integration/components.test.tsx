import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CallableProcesses from "../../src/components/callable-processes";
import Maven from "../../src/components/maven";
import ProductDetails from "../../src/components/product-details";
import type { ProductArtifact } from "../../src/data/product-types";
import "../../src/translation/ui";

const callableProcesses = [
  { name: "call(String)", processCall: "Jira/GetIssue:call(String)" },
];

const artifacts: ProductArtifact[] = [
  {
    name: "Concrete artifact",
    groupId: "com.axonivy.demo",
    artifactId: "demo-connector",
    type: "iar",
    doc: false,
    isProduct: false,
    versions: [{ version: "1.0.0", url: "https://example.com/demo.iar" }],
  },
];

describe("Component details", () => {
  it("renders Maven artifacts without process components", () => {
    const html = renderToStaticMarkup(
      <Maven
        artifacts={artifacts}
        mainArtifactId="demo-connector"
        productName="Demo"
        version="1.0.0"
        lang="en"
      />,
    );

    expect(html).toContain("Concrete artifact");
    expect(html).not.toContain("Jira/GetIssue:call(String)");
    expect(html).toMatch(/<h4[^>]*>Maven<\/h4>/);
    expect(html).toMatch(/<h5[^>]*>Concrete artifact<\/h5>/);
  });

  it("renders a reported process independently", () => {
    const html = renderToStaticMarkup(
      <CallableProcesses processes={callableProcesses} lang="en" />,
    );

    expect(html).toContain("Jira/GetIssue:call(String)");
    expect(html).toContain("(call(String))");
    expect(html).toContain("Processes");
  });

  it("places the process before Maven artifacts in the Components tab", () => {
    const html = renderToStaticMarkup(
      <ProductDetails
        callableProcesses={callableProcesses}
        maven={{
          artifacts,
          mainArtifactId: "demo-connector",
          productName: "Demo",
          version: "1.0.0",
          lang: "en",
        }}
        lang="en"
      />,
    );

    const componentPosition = html.indexOf("Jira/GetIssue:call(String)");
    const artifactPosition = html.indexOf("Concrete artifact");
    expect(componentPosition).toBeGreaterThanOrEqual(0);
    expect(artifactPosition).toBeGreaterThan(componentPosition);
  });

  it("combines README, process, and Maven components in one tab", () => {
    const html = renderToStaticMarkup(
      <ProductDetails
        readme={{
          sections: { description: "", components: "README components" },
          baseUrl: "/readme-assets/demo/",
        }}
        callableProcesses={callableProcesses}
        maven={{
          artifacts,
          mainArtifactId: "demo-connector",
          productName: "Demo",
          version: "1.0.0",
          lang: "en",
        }}
        lang="en"
      />,
    );

    expect(html.match(/Components/g)).toHaveLength(2);
    expect(html).toContain("README components");
    expect(html).toContain("Jira/GetIssue:call(String)");
    expect(html).toContain("Concrete artifact");
  });

  it("shows README components without report or Maven components", () => {
    const html = renderToStaticMarkup(
      <ProductDetails
        readme={{
          sections: { description: "", components: "README components" },
          baseUrl: "/readme-assets/demo/",
        }}
        callableProcesses={[]}
        lang="en"
      />,
    );

    expect(html.match(/Components/g)).toHaveLength(2);
    expect(html).toContain("README components");
  });

  it("shows process components without Maven artifacts", () => {
    const html = renderToStaticMarkup(
      <ProductDetails callableProcesses={callableProcesses} lang="en" />,
    );

    expect(html).toContain("Components");
    expect(html).toContain("Jira/GetIssue:call(String)");
  });
});
