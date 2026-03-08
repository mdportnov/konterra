import type { Locale } from './locales'

export interface LandingTranslations {
  meta: {
    title: string
    description: string
  }
  nav: {
    signIn: string
    requestAccess: string
  }
  hero: {
    badge: string
    titleStart: string
    titleHighlight: string
    subtitle: string
    cta: string
    learnMore: string
  }
  problem: {
    title: string
    p1: string
    p2: string
    stats: { value: string; label: string }[]
  }
  pillars: {
    badge: string
    title: string
    items: { title: string; subtitle: string; description: string }[]
  }
  thesis: {
    badge: string
    title: string
    p1: string
    p2: string
    commoditizes: string
    commoditizesList: string[]
    remains: string
    remainsList: string[]
  }
  features: {
    badge: string
    title: string
    categories: {
      label: string
      features: { title: string; description: string }[]
    }[]
  }
  antiCrm: {
    title: string
    description: string
    diffs: { label: string; desc: string }[]
  }
  cta: {
    title: string
    highlight: string
    description: string
    button: string
  }
  footer: {
    tagline: string
    privacy: string
    rights: string
  }
}

const en: LandingTranslations = {
  meta: {
    title: 'Konterra — Private Intelligence Network | Map Your Relationships & Journeys',
    description: 'Your most valuable assets aren\'t indexed by any search engine. Konterra maps, measures, and mobilizes the relationships and journeys that define your career on an interactive 3D globe.',
  },
  nav: {
    signIn: 'Sign In',
    requestAccess: 'Request Access',
  },
  hero: {
    badge: 'Private Intelligence Network',
    titleStart: 'AI can replace your expertise.',
    titleHighlight: "It can't replace your introductions — or your journeys.",
    subtitle: 'Your network and your travels are the last competitive advantages AI cannot commoditize. Konterra maps both on a single globe — a private intelligence system that belongs to you.',
    cta: 'Request Early Access',
    learnMore: 'Learn more',
  },
  problem: {
    title: 'In the age of AI, knowledge is free and skills are automatable.',
    p1: "The last durable competitive advantage is who you know — and who knows you. Where you've been shapes who you know, and who you know shapes where you go next. Yet most people manage their most valuable assets with scattered contacts, forgotten LinkedIn connections, and guesswork.",
    p2: "Every year, relationships decay silently. Introductions go unmade. Opportunities pass to people who simply stayed in touch. The problem isn't your network — it's your visibility into it.",
    stats: [
      { value: '50%', label: 'of opportunities come through personal connections' },
      { value: '25%', label: 'faster hires when sourced through referrals' },
      { value: '80%', label: 'of deals in venture & PE come from firm networks' },
    ],
  },
  pillars: {
    badge: 'How it works',
    title: 'Map. Measure. Mobilize.',
    items: [
      {
        title: 'Map',
        subtitle: 'See your world',
        description: 'Visualize your network and travel history on an interactive 3D globe. Contacts, trips, visited countries, and wishlists — plotted, searchable, and explorable. Turn scattered data into a living topology of your social capital and journeys.',
      },
      {
        title: 'Measure',
        subtitle: 'Know your strength',
        description: 'Relationship scoring, interaction tracking, and decay alerts ensure you nurture the connections that matter — before they fade. A full travel timeline tracks every trip, every country, every gap between journeys.',
      },
      {
        title: 'Mobilize',
        subtitle: 'Activate your reach',
        description: "Planning a trip? See which contacts live in your destination. When opportunity strikes, find the warmest path to any person through your existing connections. Track favors, introductions, and reciprocity — the currency of trust that no algorithm can replicate.",
      },
    ],
  },
  thesis: {
    badge: 'The social capital thesis',
    title: 'The more work becomes automated, the more human connection becomes a competitive advantage.',
    p1: 'AI is commoditizing knowledge at an unprecedented rate. Research that took weeks now takes seconds. Skills that took years to learn are being compressed into prompts.',
    p2: 'But AI cannot personally introduce you to a colleague, extend its social capital on your behalf, or vouch for your character in a room you\'re not in. Your relationships remain the one asset that is fundamentally non-replicable.',
    commoditizes: 'What AI commoditizes',
    commoditizesList: ['Knowledge & research', 'Technical skills', 'Content creation', 'Data analysis'],
    remains: 'What remains yours',
    remainsList: ['Trusted introductions', 'Reciprocal relationships', 'Contextual reputation', 'Your travel footprint'],
  },
  features: {
    badge: 'Two dimensions, one globe',
    title: "Everything you need. Nothing you don't.",
    categories: [
      {
        label: 'Network Intelligence',
        features: [
          { title: '3D Globe Visualization', description: 'Your contacts mapped across the planet in real time' },
          { title: 'Relationship Scoring', description: 'Automated scoring based on interaction recency and depth' },
          { title: 'Connection Graph', description: 'Discover clusters, bridges, and gaps in your network' },
          { title: 'Favor & Reciprocity', description: 'Monitor the balance of social capital exchange' },
        ],
      },
      {
        label: 'Travel Intelligence',
        features: [
          { title: 'Trip Timeline', description: 'Past, current, and future trips with gap detection' },
          { title: 'Country Map', description: 'Visited countries highlighted and color-coded on the globe' },
          { title: 'Wishlist Tracking', description: 'Prioritize and plan your dream destinations' },
          { title: 'Network Overlay', description: 'See contacts in countries you visit or plan to visit' },
        ],
      },
    ],
  },
  antiCrm: {
    title: 'Konterra is not a CRM.',
    description: "It's not a sales tool. It's not a lead tracker. It's a private intelligence network — a sovereign map of your social capital that belongs to you, not a platform. No ads. No data selling. No algorithmic feed deciding who you should see.",
    diffs: [
      { label: 'Private', desc: 'Your data, your network' },
      { label: 'Sovereign', desc: "Not a platform's asset" },
      { label: 'Spatial', desc: 'Globe, not a spreadsheet' },
      { label: 'Integrated', desc: 'Network meets travel' },
    ],
  },
  cta: {
    title: 'Your network is your net worth. Your travels are your footprint.',
    highlight: 'Start seeing both.',
    description: "Access is by invitation only. Request early access and we'll review your application personally.",
    button: 'Request Early Access',
  },
  footer: {
    tagline: 'Network & Travel Intelligence',
    privacy: 'Privacy Policy',
    rights: 'All rights reserved.',
  },
}

const ru: LandingTranslations = {
  meta: {
    title: 'Konterra — Частная разведывательная сеть | Карта ваших связей и путешествий',
    description: 'Ваши самые ценные активы не индексируются поисковиками. Konterra картирует, измеряет и мобилизует связи и путешествия, определяющие вашу карьеру, на интерактивном 3D-глобусе.',
  },
  nav: {
    signIn: 'Войти',
    requestAccess: 'Получить доступ',
  },
  hero: {
    badge: 'Частная разведывательная сеть',
    titleStart: 'ИИ может заменить вашу экспертизу.',
    titleHighlight: 'Но не ваши знакомства — и не ваши путешествия.',
    subtitle: 'Ваша сеть контактов и ваши путешествия — последние конкурентные преимущества, которые ИИ не может обесценить. Konterra отображает их на одном глобусе — частная разведывательная система, принадлежащая только вам.',
    cta: 'Запросить ранний доступ',
    learnMore: 'Узнать больше',
  },
  problem: {
    title: 'В эпоху ИИ знания бесплатны, а навыки автоматизируемы.',
    p1: 'Последнее устойчивое конкурентное преимущество — это кого вы знаете и кто знает вас. Где вы побывали формирует круг знакомств, а знакомства определяют, куда вы отправитесь дальше. Но большинство людей управляют своими ценнейшими активами с помощью разрозненных контактов, забытых связей в LinkedIn и догадок.',
    p2: 'Каждый год отношения угасают незаметно. Рекомендации остаются неданными. Возможности уходят к тем, кто просто поддерживал связь. Проблема не в вашей сети — а в том, что вы её не видите.',
    stats: [
      { value: '50%', label: 'возможностей приходят через личные связи' },
      { value: '25%', label: 'быстрее найм через рекомендации' },
      { value: '80%', label: 'сделок в венчуре приходят из сети контактов' },
    ],
  },
  pillars: {
    badge: 'Как это работает',
    title: 'Картируй. Измеряй. Мобилизуй.',
    items: [
      {
        title: 'Картируй',
        subtitle: 'Увидь свой мир',
        description: 'Визуализируйте свою сеть контактов и историю путешествий на интерактивном 3D-глобусе. Контакты, поездки, посещённые страны и списки желаний — нанесены, доступны для поиска и исследования.',
      },
      {
        title: 'Измеряй',
        subtitle: 'Знай свою силу',
        description: 'Оценка отношений, отслеживание взаимодействий и уведомления об угасании гарантируют, что вы поддерживаете важные связи — пока они не угасли. Полная шкала путешествий отслеживает каждую поездку и каждый перерыв.',
      },
      {
        title: 'Мобилизуй',
        subtitle: 'Активируй охват',
        description: 'Планируете поездку? Узнайте, какие контакты живут в пункте назначения. Когда появляется возможность, найдите кратчайший путь к любому человеку через существующие связи. Отслеживайте услуги, рекомендации и взаимность.',
      },
    ],
  },
  thesis: {
    badge: 'Тезис о социальном капитале',
    title: 'Чем больше работы автоматизируется, тем ценнее становятся человеческие связи.',
    p1: 'ИИ обесценивает знания с беспрецедентной скоростью. Исследования, занимавшие недели, теперь занимают секунды. Навыки, на освоение которых уходили годы, сжимаются в промпты.',
    p2: 'Но ИИ не может лично представить вас коллеге, предоставить свой социальный капитал от вашего имени или поручиться за вас в комнате, где вас нет. Ваши отношения остаются единственным активом, который невозможно воспроизвести.',
    commoditizes: 'Что обесценивает ИИ',
    commoditizesList: ['Знания и исследования', 'Технические навыки', 'Создание контента', 'Анализ данных'],
    remains: 'Что остаётся вашим',
    remainsList: ['Доверенные рекомендации', 'Взаимные отношения', 'Контекстная репутация', 'Ваш маршрут путешествий'],
  },
  features: {
    badge: 'Два измерения, один глобус',
    title: 'Всё, что нужно. Ничего лишнего.',
    categories: [
      {
        label: 'Сетевая аналитика',
        features: [
          { title: 'Визуализация на 3D-глобусе', description: 'Ваши контакты на карте планеты в реальном времени' },
          { title: 'Оценка отношений', description: 'Автоматический скоринг на основе давности и глубины взаимодействия' },
          { title: 'Граф связей', description: 'Обнаруживайте кластеры, мосты и пробелы в вашей сети' },
          { title: 'Услуги и взаимность', description: 'Контролируйте баланс обмена социальным капиталом' },
        ],
      },
      {
        label: 'Аналитика путешествий',
        features: [
          { title: 'Хронология поездок', description: 'Прошлые, текущие и будущие поездки с обнаружением пауз' },
          { title: 'Карта стран', description: 'Посещённые страны выделены цветом на глобусе' },
          { title: 'Список желаний', description: 'Приоритизируйте и планируйте путешествия мечты' },
          { title: 'Наложение сети', description: 'Видите контакты в странах, которые посещаете или планируете' },
        ],
      },
    ],
  },
  antiCrm: {
    title: 'Konterra — это не CRM.',
    description: 'Это не инструмент продаж. Это не трекер лидов. Это частная разведывательная сеть — суверенная карта вашего социального капитала, принадлежащая вам, а не платформе. Без рекламы. Без продажи данных. Без алгоритмической ленты.',
    diffs: [
      { label: 'Частная', desc: 'Ваши данные, ваша сеть' },
      { label: 'Суверенная', desc: 'Не актив платформы' },
      { label: 'Пространственная', desc: 'Глобус, а не таблица' },
      { label: 'Интегрированная', desc: 'Сеть + путешествия' },
    ],
  },
  cta: {
    title: 'Ваша сеть — ваш капитал. Ваши путешествия — ваш след.',
    highlight: 'Начните видеть и то, и другое.',
    description: 'Доступ только по приглашению. Запросите ранний доступ, и мы лично рассмотрим вашу заявку.',
    button: 'Запросить ранний доступ',
  },
  footer: {
    tagline: 'Аналитика связей и путешествий',
    privacy: 'Политика конфиденциальности',
    rights: 'Все права защищены.',
  },
}

const es: LandingTranslations = {
  meta: {
    title: 'Konterra — Red de Inteligencia Privada | Mapea tus relaciones y viajes',
    description: 'Tus activos más valiosos no están indexados por ningún buscador. Konterra mapea, mide y moviliza las relaciones y viajes que definen tu carrera en un globo 3D interactivo.',
  },
  nav: {
    signIn: 'Iniciar sesión',
    requestAccess: 'Solicitar acceso',
  },
  hero: {
    badge: 'Red de Inteligencia Privada',
    titleStart: 'La IA puede reemplazar tu experiencia.',
    titleHighlight: 'Pero no puede reemplazar tus presentaciones — ni tus viajes.',
    subtitle: 'Tu red de contactos y tus viajes son las últimas ventajas competitivas que la IA no puede mercantilizar. Konterra mapea ambos en un solo globo — un sistema de inteligencia privada que te pertenece.',
    cta: 'Solicitar acceso anticipado',
    learnMore: 'Más información',
  },
  problem: {
    title: 'En la era de la IA, el conocimiento es gratis y las habilidades son automatizables.',
    p1: 'La última ventaja competitiva duradera es a quién conoces — y quién te conoce. Dónde has estado determina a quién conoces, y a quién conoces determina adónde irás después. Sin embargo, la mayoría gestiona sus activos más valiosos con contactos dispersos, conexiones olvidadas de LinkedIn y conjeturas.',
    p2: 'Cada año, las relaciones se deterioran en silencio. Las presentaciones no se hacen. Las oportunidades pasan a quienes simplemente mantuvieron el contacto. El problema no es tu red — es tu visibilidad sobre ella.',
    stats: [
      { value: '50%', label: 'de las oportunidades llegan a través de conexiones personales' },
      { value: '25%', label: 'más rápido en contrataciones por referencias' },
      { value: '80%', label: 'de los acuerdos en capital de riesgo vienen de redes de contactos' },
    ],
  },
  pillars: {
    badge: 'Cómo funciona',
    title: 'Mapea. Mide. Moviliza.',
    items: [
      {
        title: 'Mapea',
        subtitle: 'Ve tu mundo',
        description: 'Visualiza tu red de contactos e historial de viajes en un globo 3D interactivo. Contactos, viajes, países visitados y listas de deseos — trazados, buscables y explorables.',
      },
      {
        title: 'Mide',
        subtitle: 'Conoce tu fuerza',
        description: 'La puntuación de relaciones, el seguimiento de interacciones y las alertas de deterioro garantizan que nutras las conexiones importantes — antes de que se desvanezcan.',
      },
      {
        title: 'Moviliza',
        subtitle: 'Activa tu alcance',
        description: '¿Planeas un viaje? Ve qué contactos viven en tu destino. Cuando surja una oportunidad, encuentra el camino más cálido hacia cualquier persona a través de tus conexiones existentes.',
      },
    ],
  },
  thesis: {
    badge: 'La tesis del capital social',
    title: 'Cuanto más se automatiza el trabajo, más valiosa se vuelve la conexión humana.',
    p1: 'La IA está mercantilizando el conocimiento a un ritmo sin precedentes. Investigaciones que tomaban semanas ahora toman segundos. Habilidades que tomaban años se comprimen en prompts.',
    p2: 'Pero la IA no puede presentarte personalmente a un colega, extender su capital social en tu nombre, ni responder por tu carácter en una sala donde no estás. Tus relaciones siguen siendo el único activo fundamentalmente no replicable.',
    commoditizes: 'Lo que la IA mercantiliza',
    commoditizesList: ['Conocimiento e investigación', 'Habilidades técnicas', 'Creación de contenido', 'Análisis de datos'],
    remains: 'Lo que sigue siendo tuyo',
    remainsList: ['Presentaciones de confianza', 'Relaciones recíprocas', 'Reputación contextual', 'Tu huella de viajes'],
  },
  features: {
    badge: 'Dos dimensiones, un globo',
    title: 'Todo lo que necesitas. Nada que no.',
    categories: [
      {
        label: 'Inteligencia de Red',
        features: [
          { title: 'Visualización en Globo 3D', description: 'Tus contactos mapeados en el planeta en tiempo real' },
          { title: 'Puntuación de Relaciones', description: 'Puntuación automatizada basada en recencia y profundidad' },
          { title: 'Grafo de Conexiones', description: 'Descubre clusters, puentes y brechas en tu red' },
          { title: 'Favores y Reciprocidad', description: 'Monitorea el balance de intercambio de capital social' },
        ],
      },
      {
        label: 'Inteligencia de Viajes',
        features: [
          { title: 'Cronología de Viajes', description: 'Viajes pasados, actuales y futuros con detección de brechas' },
          { title: 'Mapa de Países', description: 'Países visitados resaltados y codificados por color en el globo' },
          { title: 'Lista de Deseos', description: 'Prioriza y planifica tus destinos soñados' },
          { title: 'Superposición de Red', description: 'Ve contactos en países que visitas o planeas visitar' },
        ],
      },
    ],
  },
  antiCrm: {
    title: 'Konterra no es un CRM.',
    description: 'No es una herramienta de ventas. No es un rastreador de leads. Es una red de inteligencia privada — un mapa soberano de tu capital social que te pertenece, no a una plataforma. Sin anuncios. Sin venta de datos. Sin feed algorítmico.',
    diffs: [
      { label: 'Privada', desc: 'Tus datos, tu red' },
      { label: 'Soberana', desc: 'No es activo de plataforma' },
      { label: 'Espacial', desc: 'Globo, no hoja de cálculo' },
      { label: 'Integrada', desc: 'Red + viajes' },
    ],
  },
  cta: {
    title: 'Tu red es tu patrimonio. Tus viajes son tu huella.',
    highlight: 'Empieza a ver ambos.',
    description: 'El acceso es solo por invitación. Solicita acceso anticipado y revisaremos tu solicitud personalmente.',
    button: 'Solicitar acceso anticipado',
  },
  footer: {
    tagline: 'Inteligencia de Red y Viajes',
    privacy: 'Política de Privacidad',
    rights: 'Todos los derechos reservados.',
  },
}

const zh: LandingTranslations = {
  meta: {
    title: 'Konterra — 私人情报网络 | 绘制你的人脉与旅程',
    description: '你最有价值的资产不被任何搜索引擎索引。Konterra在交互式3D地球上绘制、衡量和动员定义你职业生涯的人脉关系和旅程。',
  },
  nav: {
    signIn: '登录',
    requestAccess: '申请访问',
  },
  hero: {
    badge: '私人情报网络',
    titleStart: 'AI可以取代你的专业知识。',
    titleHighlight: '但无法取代你的人脉引荐——或你的旅程。',
    subtitle: '你的人脉网络和旅行经历是AI无法商品化的最后竞争优势。Konterra将两者映射在同一个地球上——一个属于你的私人情报系统。',
    cta: '申请提前访问',
    learnMore: '了解更多',
  },
  problem: {
    title: '在AI时代，知识免费，技能可自动化。',
    p1: '最持久的竞争优势是你认识谁——以及谁认识你。你去过的地方塑造了你的人脉，而你的人脉决定了你接下来要去哪里。然而，大多数人用零散的联系人、被遗忘的LinkedIn连接和猜测来管理他们最有价值的资产。',
    p2: '每年，关系在不知不觉中衰退。推荐信未被发出。机会流向了那些保持联系的人。问题不在于你的人脉——而在于你对它的可见性。',
    stats: [
      { value: '50%', label: '的机会来自个人关系' },
      { value: '25%', label: '通过推荐招聘更快' },
      { value: '80%', label: '风投交易来自人脉网络' },
    ],
  },
  pillars: {
    badge: '工作原理',
    title: '绘制。衡量。动员。',
    items: [
      {
        title: '绘制',
        subtitle: '看见你的世界',
        description: '在交互式3D地球上可视化你的人脉网络和旅行历史。联系人、行程、访问过的国家和愿望清单——全部标绘、可搜索、可探索。',
      },
      {
        title: '衡量',
        subtitle: '了解你的实力',
        description: '关系评分、互动追踪和衰退预警确保你维护重要的人脉——在它们消退之前。完整的旅行时间线追踪每一次行程和每一个间隔。',
      },
      {
        title: '动员',
        subtitle: '激活你的影响力',
        description: '计划旅行？查看哪些联系人住在目的地。当机会来临时，通过现有连接找到通往任何人的最温暖路径。追踪人情、引荐和互惠。',
      },
    ],
  },
  thesis: {
    badge: '社会资本论',
    title: '工作越自动化，人际关系就越成为竞争优势。',
    p1: 'AI正以前所未有的速度将知识商品化。曾经需要数周的研究现在只需数秒。需要数年学习的技能被压缩成提示词。',
    p2: '但AI无法亲自将你介绍给同事，无法代表你提供社会资本，也无法在你不在的房间里为你的品格担保。你的人际关系仍然是根本不可复制的唯一资产。',
    commoditizes: 'AI商品化的',
    commoditizesList: ['知识与研究', '技术技能', '内容创作', '数据分析'],
    remains: '仍属于你的',
    remainsList: ['可信赖的引荐', '互惠关系', '语境化声誉', '你的旅行足迹'],
  },
  features: {
    badge: '两个维度，一个地球',
    title: '你需要的一切。不多余。',
    categories: [
      {
        label: '人脉情报',
        features: [
          { title: '3D地球可视化', description: '你的联系人实时标注在星球上' },
          { title: '关系评分', description: '基于互动时效性和深度的自动评分' },
          { title: '连接图谱', description: '发现你网络中的集群、桥梁和空白' },
          { title: '人情与互惠', description: '监控社会资本交换的平衡' },
        ],
      },
      {
        label: '旅行情报',
        features: [
          { title: '行程时间线', description: '过去、当前和未来的旅行，带间隔检测' },
          { title: '国家地图', description: '访问过的国家在地球上以颜色高亮显示' },
          { title: '愿望清单', description: '优先排列和规划你的梦想目的地' },
          { title: '人脉叠加', description: '查看你访问或计划访问的国家中的联系人' },
        ],
      },
    ],
  },
  antiCrm: {
    title: 'Konterra 不是 CRM。',
    description: '它不是销售工具。不是线索追踪器。它是一个私人情报网络——属于你而非平台的社会资本主权地图。没有广告。没有数据出售。没有算法推送。',
    diffs: [
      { label: '私密', desc: '你的数据，你的人脉' },
      { label: '主权', desc: '不是平台的资产' },
      { label: '空间化', desc: '地球仪，非电子表格' },
      { label: '整合', desc: '人脉+旅行' },
    ],
  },
  cta: {
    title: '你的人脉是你的财富。你的旅行是你的足迹。',
    highlight: '开始同时看见两者。',
    description: '仅限邀请访问。申请提前访问，我们将亲自审核您的申请。',
    button: '申请提前访问',
  },
  footer: {
    tagline: '人脉与旅行情报',
    privacy: '隐私政策',
    rights: '保留所有权利。',
  },
}

const translations: Record<Locale, LandingTranslations> = { en, ru, es, zh }

export function getLandingTranslations(locale: Locale): LandingTranslations {
  return translations[locale]
}
