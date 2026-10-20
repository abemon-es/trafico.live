/**
 * Where an operator page sends people for its GTFS feed.
 *
 * TransitOperator.feedUrl is the URL that served the ZIP (transit-gtfs), and
 * when MobilityData holds no copy that is whatever the catalog lists as the
 * producer's: for Zaratán and RíoBUS, files.catbox.moe, an anonymous file
 * host. We link the ZIP itself only on MobilityData's own file server; for
 * anything else the link is the feed's page in the MobilityData catalog,
 * which names the producer and its sources.
 */

const DIRECT_HOSTS = new Set(["files.mobilitydatabase.org"]);

export interface FeedLink {
  href: string;
  label: string;
  /** true: href is the ZIP itself; false: the catalog page. */
  direct: boolean;
}

export function feedLink(mdbId: string, feedUrl: string | null): FeedLink | null {
  if (feedUrl) {
    try {
      const u = new URL(feedUrl);
      if (u.protocol === "https:" && DIRECT_HOSTS.has(u.hostname)) {
        return { href: u.href, label: u.href.length > 60 ? `${u.href.slice(0, 60)}...` : u.href, direct: true };
      }
    } catch {
      // not a URL: fall through to the catalog page
    }
  }
  if (!/^mdb-\d+$/.test(mdbId)) return null;
  return {
    href: `https://mobilitydatabase.org/feeds/gtfs/${mdbId}`,
    label: `catálogo MobilityData (${mdbId})`,
    direct: false,
  };
}
