/**
 * Global search contract (Spec §3.4). Results are grouped across the six
 * entity families; selecting one navigates to its detail page.
 */
export type SearchEntityGroup =
  | 'Institutions'
  | 'Examinations'
  | 'Findings'
  | 'Returns'
  | 'Directives'
  | 'Reports'
  | 'Prudential'
  | 'Regulatory'

export interface SearchResultItem {
  id: string
  group: SearchEntityGroup
  title: string
  subtitle: string
  /** In-app route to open when the result is selected. */
  path: string
}

export interface SearchService {
  search(query: string): Promise<SearchResultItem[]>
}

export const SEARCH_GROUP_ORDER: SearchEntityGroup[] = [
  'Institutions',
  'Examinations',
  'Findings',
  'Returns',
  'Directives',
  'Reports',
  'Prudential',
  'Regulatory',
]
