export type PageType = 'Review' | 'Presell' | 'Advertorial' | 'Landing Page' | 'Bridge Page' | 'Cookie Presell';

export type ComponentType =
  | 'headline'
  | 'text'
  | 'button'
  | 'image'
  | 'video'
  | 'faq'
  | 'testimonials'
  | 'guarantee'
  | 'compare'
  | 'timer';

export interface PageComponent {
  id: string;
  type: ComponentType;
  content: {
    title?: string;
    text?: string;
    buttonText?: string;
    buttonUrl?: string;
    src?: string;
    alt?: string;
    embedCode?: string;
    percentage?: number;
    items?: Array<{ subtitle: string; description: string; [key: string]: any }>;
    testimonialsList?: Array<{ name: string; text: string; role?: string; avatarUrl?: string }>;
    faqList?: Array<{ question: string; answer: string }>;
    durationMinutes?: number;
    compareFields?: Array<{ feature: string; productA: string; productB: string; valueA: boolean; valueB: boolean }>;
    [key: string]: any;
  };
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  type: PageType;
  status: 'Publicada' | 'Rascunho';
  originalUrl?: string;
  productName: string;
  createdAt: string;
  views: number;
  clicks: number;
  ctr: number;
  components: PageComponent[];
  
  // Additional requested table fields
  affiliate_link?: string;
  domain?: string;
  published_url?: string;
  page_type?: PageType;

  // New Cookie Presell configuration & language fields
  cookie_destination_type?: 'url_review' | 'url_presell' | 'url_oferta' | 'link_afiliado' | 'slug';
  cookie_destination_url?: string;
  cookie_display_delay?: number; // In seconds: 0, 3, 5, 10
  cookie_appearance?: 'modal' | 'fullscreen' | 'bottom_bar' | 'popup';
  cookie_niche?: 'Saúde' | 'Finanças' | 'Relacionamento' | 'Beleza' | 'E-commerce' | 'Tecnologia';
  generation_language?: 'pt' | 'en' | 'es' | 'it';
}

export interface Plan {
  id: 'starter' | 'pro' | 'unlimited';
  name: string;
  price: string;
  subPrice?: string;
  limitPages: number;
  features: string[];
}

export interface ClientProfile {
  name: string;
  email: string;
  planId: 'starter' | 'pro' | 'unlimited';
  pagesCreatedCount: number;
  customDomain?: string;
  subdomain: string;
  avatarUrl?: string;
}

export interface PixelIntegrations {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  tiktokPixelId?: string;
}

export interface AnalyticsRecord {
  id: string;
  pageId: string;
  timestamp: string;
  type: 'view' | 'click';
  referrer?: string;
  device?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}
