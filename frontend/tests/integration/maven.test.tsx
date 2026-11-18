import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Maven from "../../src/components/maven";
import ProductDetails from "../../src/components/product-details";
import type { ProductArtifact } from "../../src/data/product-types";
import "../../src/translation/ui";

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

describe("Maven details", () => {
  it("renders process components before Maven artifacts", () => {
    const html = renderToStaticMarkup(
      <Maven
        artifacts={artifacts}
        components={[
          { name: "call(String)", processCall: "Jira/GetIssue:call(String)" },
        ]}
        mainArtifactId="demo-connector"
        productName="Demo"
        version="1.0.0"
        lang="en"
      />,
    );

    const componentPosition = html.indexOf("Jira/GetIssue:call(String)");
    const artifactPosition = html.indexOf("Concrete artifact");
    expect(componentPosition).toBeGreaterThanOrEqual(0);
    expect(artifactPosition).toBeGreaterThan(componentPosition);
  });

  it("shows Maven beside a README Components section when report components exist", () => {
    const html = renderToStaticMarkup(
      <ProductDetails
        readme={{
          sections: {
            description: "Description",
            components: "README components",
          },
          baseUrl: "/readme-assets/demo/",
        }}
        maven={{
          artifacts,
          components: [
            { name: "call(String)", processCall: "Jira/GetIssue:call(String)" },
          ],
          mainArtifactId: "demo-connector",
          productName: "Demo",
          version: "1.0.0",
          lang: "en",
        }}
        lang="en"
      />,
    );

    expect(html).toContain("Maven");
  });

  it("keeps the Maven tab hidden when README components are the only component source", () => {
    const html = renderToStaticMarkup(
      <ProductDetails
        readme={{
          sections: {
            description: "Description",
            components: "README components",
          },
          baseUrl: "/readme-assets/demo/",
        }}
        maven={{
          artifacts,
          components: [],
          mainArtifactId: "demo-connector",
          productName: "Demo",
          version: "1.0.0",
          lang: "en",
        }}
        lang="en"
      />,
    );

    expect(html).not.toContain("Maven");
  });
});
