/**
 * Elasticsearch Index Configuration
 * Defines index mappings and settings for documentation search
 */

export interface ElasticsearchIndexConfig {
  settings: {
    number_of_shards: number
    number_of_replicas: number
    analysis: {
      analyzer: {
        japanese_analyzer: {
          type: string
          tokenizer: string
          filter: string[]
        }
      }
      tokenizer: {
        japanese_normalizer: {
          type: string
        }
      }
      filter: {
        japanese_baseform: {
          type: string
        }
        japanese_part_of_speech: {
          type: string
        }
        ja_stop: {
          type: string
          stopwords: string[]
        }
        kuromoji_stemmer: {
          type: string
          minimum_length: number
        }
      }
    }
  }
  mappings: {
    properties: {
      id: { type: string }
      title: { 
        type: string
        analyzer: string
        search_analyzer: string
      }
      content: { 
        type: string
        analyzer: string
        search_analyzer: string
      }
      excerpt: { type: string }
      url: { type: string }
      type: { 
        type: string
        index: boolean
      }
      category: { 
        type: string
        analyzer: string
      }
      tags: { 
        type: string
        analyzer: string
      }
      language: { type: string }
      lastModified: { type: string }
      'metadata.author': { type: string }
      'metadata.difficulty': { type: string }
      'metadata.readingTime': { type: string }
      'metadata.version': { type: string }
      // Completion suggester fields for autocomplete
      'title.suggest': { 
        type: string
        analyzer: string
      }
      'category.suggest': { 
        type: string
        analyzer: string
      }
      'tags.suggest': { 
        type: string
        analyzer: string
      }
    }
  }
}

export const documentationIndexConfig: ElasticsearchIndexConfig = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        japanese_analyzer: {
          type: "custom",
          tokenizer: "kuromoji_tokenizer",
          filter: [
            "kuromoji_baseform",
            "ja_stop",
            "kuromoji_stemmer"
          ]
        },
        // Analyzer for completion suggester
        suggestion_analyzer: {
          type: "custom",
          tokenizer: "keyword",
          filter: ["lowercase"]
        }
      },
      tokenizer: {
        japanese_normalizer: {
          type: "kuromoji_tokenizer"
        }
      },
      filter: {
        japanese_baseform: {
          type: "kuromoji_baseform"
        },
        japanese_part_of_speech: {
          type: "kuromoji_part_of_speech"
        },
        ja_stop: {
          type: "stop",
          stopwords: [
            "あ", "い", "う", "え", "お",
            "か", "き", "く", "け", "こ",
            "さ", "し", "す", "せ", "そ",
            "た", "ち", "つ", "て", "と",
            "な", "に", "ぬ", "ね", "の",
            "は", "ひ", "ふ", "へ", "ほ",
            "ま", "み", "む", "め", "も",
            "や", "ゆ", "よ",
            "ら", "り", "る", "れ", "ろ",
            "わ", "を", "ん",
            "が", "ぎ", "ぐ", "げ", "ご",
            "ざ", "じ", "ず", "ぜ", "ぞ",
            "だ", "ぢ", "づ", "で", "ど",
            "ば", "び", "ぶ", "べ", "ぼ",
            "ぱ", "ぴ", "ぷ", "ぺ", "ぽ"
          ]
        },
        kuromoji_stemmer: {
          type: "kuromoji_stemmer",
          minimum_length: 4
        }
      }
    }
  },
  mappings: {
    properties: {
      id: { type: "keyword" },
      title: { 
        type: "text",
        analyzer: "japanese_analyzer",
        search_analyzer: "japanese_analyzer"
      },
      content: { 
        type: "text",
        analyzer: "japanese_analyzer",
        search_analyzer: "japanese_analyzer"
      },
      excerpt: { type: "text" },
      url: { type: "keyword" },
      type: { 
        type: "keyword",
        index: false
      },
      category: { 
        type: "keyword",
        analyzer: "japanese_analyzer"
      },
      tags: { 
        type: "keyword",
        analyzer: "japanese_analyzer"
      },
      language: { type: "keyword" },
      lastModified: { type: "date" },
      'metadata.author': { type: "keyword" },
      'metadata.difficulty': { type: "keyword" },
      'metadata.readingTime': { type: "integer" },
      'metadata.version': { type: "keyword" },
      // Completion suggester fields for autocomplete
      'title.suggest': { 
        type: "completion",
        analyzer: "suggestion_analyzer"
      },
      'category.suggest': { 
        type: "completion",
        analyzer: "suggestion_analyzer"
      },
      'tags.suggest': { 
        type: "completion",
        analyzer: "suggestion_analyzer"
      }
    }
  }
}