import { SEARCH_RECORDS } from '@/mocks/fixtures/search.fixture'
import type { SearchService, SearchResultItem } from '@/services/contracts/SearchService'
import { SEARCH_GROUP_ORDER } from '@/services/contracts/SearchService'

const LATENCY_MS = 150

export class MockSearchService implements SearchService {
  async search(query: string): Promise<SearchResultItem[]> {
    await new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const matches = SEARCH_RECORDS.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q),
    )
    return matches.sort(
      (a, b) => SEARCH_GROUP_ORDER.indexOf(a.group) - SEARCH_GROUP_ORDER.indexOf(b.group),
    )
  }
}

export const searchService: SearchService = new MockSearchService()
