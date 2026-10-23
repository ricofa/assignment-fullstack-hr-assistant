export function createChatTitle(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, 60)
}
