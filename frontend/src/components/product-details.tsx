import { H4, P } from "@/components/ui/typography";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProductDetails() {
  return (
    <Tabs defaultValue="description" className="space-y-12">
      <TabsList variant="line">
        <TabsTrigger className="px-6 py-5" value="description">
          <H4>Description</H4>
        </TabsTrigger>
        <TabsTrigger className="px-6 py-5" value="demo">
          <H4>Demo</H4>
        </TabsTrigger>
        <TabsTrigger className="px-6 py-5" value="installation">
          <H4>Installation Guide</H4>
        </TabsTrigger>
        <TabsTrigger className="px-6 py-5" value="maven">
          <H4>Maven</H4>
        </TabsTrigger>
        <TabsTrigger className="px-6 py-5" value="changelog">
          <H4>Changelog</H4>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="description">
        <P>Here is the description of the product.</P>
      </TabsContent>
      <TabsContent value="demo">
        <P>Here is the demo of the product.</P>
      </TabsContent>
      <TabsContent value="installation">
        <P>Here is the installation guide of the product.</P>
      </TabsContent>
      <TabsContent value="maven">
        <P>Here is the Maven configuration for the product.</P>
      </TabsContent>
      <TabsContent value="changelog">
        <P>Here is the changelog of the product.</P>
      </TabsContent>
    </Tabs>
  );
}
