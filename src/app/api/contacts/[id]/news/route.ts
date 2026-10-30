import { EMPTY_COMPANY_NEWS } from "@/lib/contacts/company-news";
import { fetchCompanyNews } from "@/lib/services/newsService";
import {
  cachedNewsIfFresh,
  readCompanyNewsCache,
  writeCompanyNewsCache,
} from "@/lib/supabase/company-news";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contactId = id?.trim();
    if (!contactId) {
      return Response.json({ error: "Invalid contact id" }, { status: 400 });
    }

    const loaded = await readCompanyNewsCache(contactId);
    if (!loaded) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }

    const fresh = cachedNewsIfFresh(
      loaded.cache,
      loaded.domain,
      loaded.companyName
    );
    if (fresh) {
      return Response.json({ news: fresh, cached: true });
    }

    if (!loaded.domain) {
      return Response.json({ news: EMPTY_COMPANY_NEWS, cached: false });
    }

    if (
      !process.env.TAVILY_API_KEY?.trim() &&
      !process.env.SERPER_API_KEY?.trim()
    ) {
      return Response.json({ news: EMPTY_COMPANY_NEWS, cached: false });
    }

    const news = await fetchCompanyNews({
      companyName: loaded.companyName,
      contactEmail: loaded.emails[0],
      companyWebsite: loaded.domain,
    });

    const record = {
      ...news,
      domain: loaded.domain,
      companyName: loaded.companyName,
      fetched_at: new Date().toISOString(),
    };

    void writeCompanyNewsCache(contactId, record);
    return Response.json({ news: record, cached: false });
  } catch (err) {
    console.error("Contact news GET error:", err);
    return Response.json(
      { error: "Could not load company news." },
      { status: 500 }
    );
  }
}
