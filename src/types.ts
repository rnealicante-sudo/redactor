export interface NewsArticle {
  headline: string;
  subheadline: string;
  category: string;
  dateline: string;
  leadParagraph: string;
  body: string[];
  radioScript90s?: string;
  radioScript60s?: string;
  radioScript20s?: string;
}

export interface AudioProcessingResult {
  title: string;
  fullTranscription: string;
  summary: string;
  keyPoints: string[];
  newsArticle?: NewsArticle;
  processedAt: string;
  audioName?: string;
  audioDuration?: number;
}
