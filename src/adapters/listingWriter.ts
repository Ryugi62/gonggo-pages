import { writeFileSync, readFileSync } from 'node:fs';
import type { PublicListing } from '../domain/listing.ts';

export interface ListingFile {
  generatedAt: string;
  listings: PublicListing[];
}

/** 포트 ListingWriter 구현: 저장소에 커밋되는 공개 파일 */
export function writeListings(path: string, generatedAt: string, listings: PublicListing[]): void {
  const file: ListingFile = { generatedAt, listings };
  writeFileSync(path, JSON.stringify(file, null, 1) + '\n');
}

export function readListings(path: string): ListingFile {
  return JSON.parse(readFileSync(path, 'utf8')) as ListingFile;
}
