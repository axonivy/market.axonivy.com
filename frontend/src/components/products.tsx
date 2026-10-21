import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Base, H5 } from "@/components/ui/typography";
import {
  FILTER_VALUES,
  getFilters,
  typeLabel,
  type Filter,
  type ProductSummary,
} from "@/data/product-types";
import { cn } from "@/lib/utils";
import { localePath } from "@/translation/language";
import "@/translation/ui";
import type { Lang } from "@/translation/ui";
import { IconBan, IconSearch, IconX } from "@tabler/icons-react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/react";
import { useTranslation } from "react-i18next";

const SORT_VALUES = ["featured", "az", "za"] as const;
type SortOrder = (typeof SORT_VALUES)[number];

const productSearchParams = {
  type: parseAsStringLiteral(FILTER_VALUES).withDefault("all"),
  sort: parseAsStringLiteral(SORT_VALUES).withDefault("featured"),
  q: parseAsString.withDefault(""),
};

function compareFeatured(a: ProductSummary, b: ProductSummary): number {
  const rankA = a.featuredRank ?? Number.MAX_SAFE_INTEGER;
  const rankB = b.featuredRank ?? Number.MAX_SAFE_INTEGER;
  return rankA - rankB || a.name.localeCompare(b.name);
}

function getVisibleProducts(
  products: ProductSummary[],
  filter: Filter,
  query: string,
  sortOrder: SortOrder,
): ProductSummary[] {
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
    .sort((a, b) =>
      sortOrder === "featured"
        ? compareFeatured(a, b)
        : direction * a.name.localeCompare(b.name),
    );
}

type ProductsProps = { products: ProductSummary[]; lang: Lang };

export default function Products({ products, lang }: ProductsProps) {
  return (
    <NuqsAdapter>
      <ProductList products={products} lang={lang} />
    </NuqsAdapter>
  );
}

function ProductList({ products, lang }: ProductsProps) {
  const [{ type, sort, q }, setParams] = useQueryStates(productSearchParams);
  const visibleProducts = getVisibleProducts(products, type, q, sort);
  const { t } = useTranslation(undefined, { lng: lang });

  return (
    <section className="mt-12">
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex flex-row items-center gap-2 md:flex-col md:items-start">
            <H5>{t("dashboard.viewOptions.filter.title")}</H5>
            <div className="flex flex-row gap-2">
              {getFilters(t).map(({ value, label }) => (
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
            <H5 className="shrink-0 whitespace-nowrap">
              {t("dashboard.viewOptions.sort.title")}
            </H5>
            <NativeSelect
              className="min-w-0 flex-1 md:w-40 md:flex-none"
              value={sort}
              onChange={(event) =>
                setParams({
                  sort: event.currentTarget.value as "az" | "za" | "featured",
                })
              }
            >
              <NativeSelectOption value="featured">
                {t("dashboard.viewOptions.sort.featured")}
              </NativeSelectOption>
              <NativeSelectOption value="az">
                {t("dashboard.viewOptions.sort.az")}
              </NativeSelectOption>
              <NativeSelectOption value="za">
                {t("dashboard.viewOptions.sort.za")}
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <div>
          <InputGroup className="h-10 w-full">
            <InputGroupInput
              placeholder={t("dashboard.viewOptions.search.placeholder")}
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
          <a href={localePath(lang, `/${product.id}`)} key={product.id}>
            <Card className="min-h-66">
              <CardHeader className="flex flex-row justify-between">
                <img
                  src={product.logo}
                  alt=""
                  width={70}
                  height={70}
                  loading="lazy"
                  className={cn(
                    "rounded-md object-contain",
                    product.logoDark && "dark:hidden",
                  )}
                />
                {product.logoDark && (
                  <img
                    src={product.logoDark}
                    alt=""
                    width={70}
                    height={70}
                    loading="lazy"
                    className="hidden rounded-md object-contain dark:block"
                  />
                )}
                <div className="flex flex-row gap-1">
                  {product.deprecated && (
                    <Badge variant="orange">
                      {t("dashboard.badges.deprecated")}
                    </Badge>
                  )}
                  {product.featuredRank !== undefined && (
                    <Badge variant="green">
                      {t("dashboard.badges.featured")}
                    </Badge>
                  )}
                  <Badge>{typeLabel(t, product.type)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <H5>{product.name}</H5>
                <Base>{product.description}</Base>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
      {visibleProducts.length === 0 && (
        <div className="text-n800 flex flex-col items-center gap-2 pt-12">
          <IconBan className="size-12 shrink-0 stroke-1" />
          <Base className="text-center text-xs whitespace-pre-line">
            {t("dashboard.viewOptions.search.notFound")}
          </Base>
        </div>
      )}
    </section>
  );
}
