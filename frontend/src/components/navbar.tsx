import { Fragment, useState } from "react";
import {
  IconArrowUpRight,
  IconChevronDown,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Drawer, DrawerContent, DrawerFooter } from "@/components/ui/drawer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Base, H6 } from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations, type Lang, type TranslationKey } from "@/i18n/ui";

type NavLink = {
  label: TranslationKey;
  description?: TranslationKey;
  href: string;
  external: boolean;
};

type NavGroup = {
  label: TranslationKey;
  items: { label: TranslationKey; items: NavLink[] }[];
};

const navItems: (NavLink | NavGroup)[] = [
  {
    label: "common.download",
    href: "https://dev.axonivy.com/download",
    external: false,
  },
  { label: "nav.doc", href: "https://dev.axonivy.com/doc", external: false },
  {
    label: "nav.resources",
    items: [
      {
        label: "nav.product.information",
        items: [
          {
            label: "nav.release.cycle",
            description: "nav.release.cycle.description",
            href: "https://dev.axonivy.com/download/release-cycle",
            external: false,
          },
          {
            label: "nav.deprecation",
            description: "nav.deprecation.description",
            href: "https://dev.axonivy.com/deprecation",
            external: false,
          },
        ],
      },
      {
        label: "nav.external.resources",
        items: [
          {
            label: "nav.market",
            description: "nav.market.description",
            href: "/",
            external: true,
          },
          {
            label: "nav.community",
            description: "nav.community.description",
            href: "https://community.axonivy.com/",
            external: true,
          },
          {
            label: "nav.tutorial",
            description: "nav.tutorial.description",
            href: "https://axonivy.com/tutorial",
            external: true,
          },
        ],
      },
    ],
  },
  { label: "nav.news", href: "https://dev.axonivy.com/news", external: false },
  { label: "nav.team", href: "https://dev.axonivy.com/team", external: false },
];

export default function Navbar({
  lang,
  urls,
}: {
  lang: Lang;
  urls: Record<Lang, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations(lang);

  return (
    <div className="relative">
      <NavigationMenu align="center" className="hidden md:flex">
        <NavigationMenuList>
          {navItems.map((item) => {
            return "items" in item ? (
              <NavigationMenuItem key={item.label}>
                <NavigationMenuTrigger>{t(item.label)}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="flex w-fit gap-4 p-2">
                    {item.items.map((subItem, index) => (
                      <Fragment key={subItem.label}>
                        {index > 0 && <Separator orientation="vertical" />}
                        <ul className="flex flex-1 flex-col">
                          <H6 className="dark:text-n700 p-2">
                            {t(subItem.label)}
                          </H6>
                          {subItem.items.map((subSubItem) => (
                            <li key={subSubItem.label}>
                              <NavigationMenuLink
                                className="w-full items-start justify-start"
                                render={
                                  <a
                                    href={subSubItem.href}
                                    target={
                                      subSubItem.external ? "_blank" : "_self"
                                    }
                                    rel={
                                      subSubItem.external
                                        ? "noopener noreferrer"
                                        : undefined
                                    }
                                  >
                                    <span className="flex flex-col gap-0.5">
                                      <span className="flex items-center gap-1">
                                        <Base className="text-n900">
                                          {t(subSubItem.label)}
                                        </Base>
                                        {subSubItem.external && (
                                          <IconArrowUpRight
                                            className="text-n900 size-3 stroke-2"
                                            aria-hidden="true"
                                          />
                                        )}
                                      </span>
                                      <span className="text-muted-foreground dark:text-n700 text-sm whitespace-nowrap">
                                        {subSubItem.description &&
                                          t(subSubItem.description)}
                                      </span>
                                    </span>
                                  </a>
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      </Fragment>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ) : (
              <NavigationMenuItem key={item.label}>
                <NavigationMenuLink
                  className={
                    navigationMenuTriggerStyle() + " items-start gap-1"
                  }
                  render={
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : "_self"}
                      rel={item.external ? "noopener noreferrer" : undefined}
                    >
                      {t(item.label)}

                      {item.external && (
                        <IconArrowUpRight
                          className="size-3 stroke-2"
                          aria-hidden="true"
                        />
                      )}
                    </a>
                  }
                />
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="md:hidden">
        <button
          type="button"
          className="text-foreground focus-visible:ring-ring/50 relative z-50 inline-flex size-9 items-center justify-center rounded-lg focus-visible:ring-3 focus-visible:outline-1"
          aria-label={t(isOpen ? "nav.menu.close" : "nav.menu.open")}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? (
            <IconX aria-hidden="true" />
          ) : (
            <IconMenu2 aria-hidden="true" />
          )}
        </button>
        <Drawer open={isOpen} onOpenChange={setIsOpen} swipeDirection="right">
          <DrawerContent
            className="w-full"
            style={{
              top: "4.3rem",
              height: "calc(100dvh - 4.3rem)",
              borderRadius: 0,
            }}
          >
            <nav aria-label={t("nav.menu.mobile")} className="px-4 pt-4">
              <ul className="flex flex-col gap-1">
                {navItems.map((item) =>
                  "items" in item ? (
                    <li key={item.label}>
                      <Collapsible className="flex w-full flex-col gap-2">
                        <CollapsibleTrigger
                          render={
                            <button className="group/button focus:bg-muted focus-visible:ring-ring/50 flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium focus-visible:ring-3 focus-visible:outline-1">
                              {t(item.label)}
                              <IconChevronDown className="ml-auto group-data-panel-open/button:rotate-180" />
                            </button>
                          }
                        />
                        <CollapsibleContent className="flex flex-col items-start gap-2 p-2.5 pt-0 text-sm">
                          {item.items.map((subItem) => {
                            return (
                              <Fragment key={subItem.label}>
                                <H6 className="py-2 pl-3 text-xs">
                                  {t(subItem.label)}
                                </H6>
                                {subItem.items.map((subSubItem) => (
                                  <a
                                    key={subSubItem.label}
                                    className="focus:bg-muted focus-visible:ring-ring/50 flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium focus-visible:ring-3 focus-visible:outline-1"
                                    href={subSubItem.href}
                                    target={
                                      subSubItem.external ? "_blank" : undefined
                                    }
                                    rel={
                                      subSubItem.external
                                        ? "noopener noreferrer"
                                        : undefined
                                    }
                                    onClick={() => setIsOpen(false)}
                                  >
                                    {t(subSubItem.label)}
                                    {subSubItem.external && (
                                      <IconArrowUpRight
                                        className="mt-3 size-3 self-start stroke-2"
                                        aria-hidden="true"
                                      />
                                    )}
                                  </a>
                                ))}
                              </Fragment>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <a
                        className="focus:bg-muted focus-visible:ring-ring/50 flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium focus-visible:ring-3 focus-visible:outline-1"
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        onClick={() => setIsOpen(false)}
                      >
                        {t(item.label)}
                        {item.external && (
                          <IconArrowUpRight
                            className="mt-3 size-3 self-start stroke-2"
                            aria-hidden="true"
                          />
                        )}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </nav>
            <DrawerFooter className="flex flex-row justify-start">
              <LanguageSwitcher lang={lang} urls={urls} />
              <ModeToggle />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
