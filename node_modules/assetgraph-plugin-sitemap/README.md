# assetgraph-plugin-sitemap

A plugin of assets and relations relating to sitemaps.

This plugin is especially useful if you intend to crawl your entire website, which might contain landing pages that are not linked to in your site navigation structure.

With this plugin, you can initialize an Assetgraph from an XML sitemap or `robots.txt` (with `Sitemap:`-directives).

Supported sitemap types:
- XML Sitemap
- Text Sitemap
- Atom feed
- RSS feed

## Installation and usage

`assetgraph-plugin-sitemap` har a peer dependency on `assetgraph`

```
npm install --save-dev assetgraph-plugin-sitemap assetgraph
```

Then use the plugin by adding the sitemap extensions to an existing Assetgraph instance:

```js
const AssetGraph = require('assetgraph');
const extendWithSitemaps = require('assetgraph-plugin-sitemap');

const graph = new AssetGraph({ root: 'https://example.com' });

extendWithSitemaps(graph);

async function main() {
  await graph.loadAssets('robots.txt', 'sitemap.xml');
  await graph.populate({
    followRelations: {
      crossorigin: false
    }
  });

  // You now have a fully populated graph based on your
  // robots.txt Sitemap:-directives and your sitemap.xml
}

main();
```

## Additions to Assetgraph

### New Assets
- `Robots` - See [robots.txt](https://en.wikipedia.org/wiki/Robots_exclusion_standard)
- `XmlSitemap` - See https://en.wikipedia.org/wiki/Sitemaps#File_format
- `TextSitemap` - See https://en.wikipedia.org/wiki/Sitemaps#Text_file

### New Relations
- `RobotsSitemap` - A relation to any sitemap format, starting from the `Sitemap: ` directive in `robots.txt`
- `XmlSitemapUrl` - A relation to a page, starting from the XML sitemap [`<url>` element](https://en.wikipedia.org/wiki/Sitemaps#Element_definitions)
- `TextSitemapUrl` - A relation to a page, starting from a URL line in `TextSitemap`

### New behavior

`robots.txt` is automatically upgraded from a `Text` asset to a `Robots` asset, which also discovers the `Sitemap:`-directives in `robots.txt` and adds `RobotsSitemap` relations to the graph.

XML sitemaps are automatically upgraded from an `Xml` asset to a `XmlSitemap` asset based on the `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` content. `<url>` elements in the Xml sitemap automatically add `XmlSitemapUrl` relations to the graph.

While `TextSitemap` assets now exist, they cannot be automatically inferred based on their contents alone. This means that a `Text` asset can only be automatically upgraded to a `TextSitemap` asset based on an incoming `RobotsSitemap` relation. It is recommended to always add a `Sitemap:`-directive to your `robots.txt` and initialize your assetgraph from there in order to have `TextSitemap` work correctly. When a `TextSitemap` is inferred, `TextSitemapUrl` relations are added to the graph for each URL line in the text file.

## License

[BSD 3-clause](https://tldrlegal.com/license/bsd-3-clause-license-(revised))
