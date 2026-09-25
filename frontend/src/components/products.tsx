import type { ImageMetadata } from "astro";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Base, H5 } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { IconBan, IconSearch, IconX } from "@tabler/icons-react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/react";

const FILTER_VALUES = ["all", "connector", "utils", "demo"] as const;
const SORT_VALUES = ["az", "za"] as const;

type Filter = (typeof FILTER_VALUES)[number];
type ProductCategory = Exclude<Filter, "all">;
type SortOrder = (typeof SORT_VALUES)[number];

type ProductMeta = {
  id: string;
  name: string;
  description: string;
  type: ProductCategory;
  listed?: boolean;
};

type Product = ProductMeta & { logo: ImageMetadata };

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "connector", label: "Connectors" },
  { value: "utils", label: "Utilities" },
  { value: "demo", label: "Demos" },
];

const productSearchParams = {
  type: parseAsStringLiteral(FILTER_VALUES).withDefault("all"),
  sort: parseAsStringLiteral(SORT_VALUES).withDefault("az"),
  q: parseAsString.withDefault(""),
};

const metaFiles = import.meta.glob<{ default: ProductMeta }>(
  "../data/market/**/meta.json",
  { eager: true },
);

const logoFiles = import.meta.glob<{ default: ImageMetadata }>(
  "../data/market/**/logo.png",
  { eager: true },
);

const ALL_PRODUCTS: Product[] = Object.entries(metaFiles)
  .map(([path, module]) => ({
    ...module.default,
    logo: logoFiles[path.replace("meta.json", "logo.png")]?.default,
  }))
  .filter(
    (product): product is Product =>
      product.listed !== false && product.logo !== undefined,
  );

function getVisibleProducts(
  products: Product[],
  filter: Filter,
  query: string,
  sortOrder: SortOrder,
): Product[] {
  const q = query.trim().toLocaleLowerCase();
  const direction = sortOrder === "az" ? 1 : -1;

  return products
    .filter((product) => filter === "all" || product.type === filter)
    .filter(
      (product) =>
        !q ||
        product.name.toLocaleLowerCase().includes(q) ||
        product.description.toLocaleLowerCase().includes(q),
    )
    .sort((a, b) => direction * a.name.localeCompare(b.name));
}

export default function Products() {
  return (
    <NuqsAdapter>
      <ProductList />
    </NuqsAdapter>
  );
}

function ProductList() {
  const [{ type, sort, q }, setParams] = useQueryStates(productSearchParams);
  const visibleProducts = getVisibleProducts(ALL_PRODUCTS, type, q, sort);

  return (
    <section className="mt-12">
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex flex-row items-center gap-2 md:flex-col md:items-start">
            <H5>Filter</H5>
            <div className="flex flex-row gap-2">
              {FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  onClick={() => setParams({ type: value })}
                  variant={type === value ? "default" : "outline"}
                  aria-pressed={type === value}
                  size="lg"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex w-full flex-row items-center gap-2 md:w-fit">
            <H5 className="shrink-0 whitespace-nowrap">Sort by:</H5>
            <NativeSelect
              className="min-w-0 flex-1 md:w-40 md:flex-none"
              value={sort}
              onChange={(event) =>
                setParams({ sort: event.currentTarget.value as "az" | "za" })
              }
            >
              <NativeSelectOption value="az">A-Z</NativeSelectOption>
              <NativeSelectOption value="za">Z-A</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <div>
          <InputGroup className="h-10 w-full">
            <InputGroupInput
              placeholder="Search a keyword"
              value={q}
              onChange={(event) => setParams({ q: event.currentTarget.value })}
            />
            <InputGroupAddon>
              <IconSearch />
            </InputGroupAddon>
            {q && (
              <InputGroupAddon align="inline-end">
                <IconX
                  onClick={() => setParams({ q: "" })}
                  className="hover:cursor-pointer"
                />
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {visibleProducts.map((product) => (
          <Card className="min-h-64" key={product.id}>
            <CardHeader className="flex flex-row justify-between">
              <img
                src={product.logo.src}
                alt=""
                width={70}
                height={70}
                loading="lazy"
                className="size-20 object-contain"
              />
              <Badge>{product.type}</Badge>
            </CardHeader>
            <CardContent>
              <H5>{product.name}</H5>
              <Base>{product.description}</Base>
            </CardContent>
          </Card>
        ))}
      </div>
      {visibleProducts.length === 0 && (
        <div className="text-n800 flex flex-col items-center gap-2 pt-12">
          <IconBan className="size-12 shrink-0 stroke-1" />
          <Base className="text-center text-xs">
            Your search did not yield any results. <br /> Please modify your
            search terms or browse our categories for related content.
          </Base>
        </div>
      )}
    </section>
  );
}
