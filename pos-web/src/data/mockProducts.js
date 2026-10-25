export const CATEGORIES = [
  { id: 'todos', name: 'Todos', emoji: '🍽️' },
  { id: 'tacos', name: 'Tacos', emoji: '🌮' },
  { id: 'burritos', name: 'Burritos', emoji: '🌯' },
  { id: 'quesadillas', name: 'Quesadillas', emoji: '🧀' },
  { id: 'mariscos', name: 'Mariscos', emoji: '🦐' },
  { id: 'bebidas', name: 'Bebidas', emoji: '🥤' },
  { id: 'especiales', name: 'Especiales', emoji: '🔥' }
];

export const MOCK_PRODUCTS = [
  {
    id: 'p001',
    name: 'Tacos al Pastor Especial',
    description: 'Carne de cerdo marinada en achiote tradicional, piña caramelizada, cebollita y cilantro fresco.',
    price: 18000,
    categoryId: 'tacos',
    spicyLevel: 2,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Cerdo marinado', 'Piña asada', 'Cilantro', 'Cebolla', 'Tortilla de maíz']
  },
  {
    id: 'p002',
    name: 'Tacos Birria con Consomé',
    description: 'Tres tacos dorados con queso fundido y res braseada 8 horas, servidos con consomé ardiente.',
    price: 24000,
    categoryId: 'tacos',
    spicyLevel: 2,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Res birria', 'Queso Oaxaca', 'Consomé especiado', 'Cebolla morada', 'Limón']
  },
  {
    id: 'p003',
    name: 'Tacos Carnitas Michoacán',
    description: 'Confite de cerdo crocante por fuera y tierno por dentro, guacamole rústico y pico de gallo.',
    price: 19500,
    categoryId: 'tacos',
    spicyLevel: 1,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Carnitas', 'Chicharrón molido', 'Pico de gallo', 'Guacamole']
  },
  {
    id: 'p004',
    name: 'Burrito Diabla Extremo',
    description: 'Mega burrito relleno de carne asada, frijoles refritos, arroz rojo, queso y salsa habanero ahumada.',
    price: 26000,
    categoryId: 'burritos',
    spicyLevel: 3,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Carne asada', 'Salsa Habanero Diabla', 'Frijol negro', 'Arroz mexicano', 'Queso gouda']
  },
  {
    id: 'p005',
    name: 'Burrito Tinga de Pollo',
    description: 'Pechuga desmechada en chipotle suave, crema agria, guacamole y queso gratinado.',
    price: 22000,
    categoryId: 'burritos',
    spicyLevel: 1,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1566740933430-b5e70b06d2d5?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Pollo en chipotle', 'Crema ácida', 'Queso fundido', 'Frijoles bayos']
  },
  {
    id: 'p006',
    name: 'Quesadilla Sincronizada Suprema',
    description: 'Tortilla gigante de trigo rellena de jamón ahumado, chorizo artesanal y triple queso derretido.',
    price: 21000,
    categoryId: 'quesadillas',
    spicyLevel: 0,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Queso Oaxaca', 'Jamón ahumado', 'Chorizo', 'Crema', 'Salsa verde']
  },
  {
    id: 'p007',
    name: 'Quesadilla Hongos & Champiñón',
    description: 'Portobellos y champiñones salteados al ajillo con epazote fresco y queso mozarella fundido.',
    price: 19000,
    categoryId: 'quesadillas',
    spicyLevel: 0,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Champiñones', 'Epazote', 'Ajo dorado', 'Queso fundido']
  },
  {
    id: 'p008',
    name: 'Tacos Camarón Ensenada',
    description: 'Camarones tempura crujientes sobre tortilla caliente, repollo morado curtido y mayonesa chipotle.',
    price: 27000,
    categoryId: 'mariscos',
    spicyLevel: 1,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1512838243191-e81e88cc8f54?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Camarón tempura', 'Slaw morado', 'Mayo-chipotle', 'Cilantro']
  },
  {
    id: 'p009',
    name: 'Aguachile Rojo La Diabla',
    description: 'Camarones frescos marinados en jugo de lima, chile chiltepín ardiente, pepino persa y cebolla morada.',
    price: 32000,
    categoryId: 'mariscos',
    spicyLevel: 3,
    available: false, // Producto de prueba agotado para probar status pill y disable
    imageUrl: 'https://images.unsplash.com/photo-1535400255456-984241443b29?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Camarón crudo fresco', 'Chile Chiltepín', 'Lima recién exprimida', 'Pepino', 'Aguacate']
  },
  {
    id: 'p010',
    name: 'Molcajete Volcánico Diabla',
    description: 'Carne asada, pechuga, chorizo, queso asado y nopales servidos borboteando en salsa volcánica.',
    price: 45000,
    categoryId: 'especiales',
    spicyLevel: 3,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Bife de res', 'Chorizo', 'Queso panela asado', 'Nopal tierno', 'Cebollitas cambray']
  },
  {
    id: 'p011',
    name: 'Margarita Fuego de Habanero',
    description: 'Tequila reposado 100% agave, infusión de habanero, licor de naranja, jugo de lima y escarchado Tajín.',
    price: 18000,
    categoryId: 'bebidas',
    spicyLevel: 2,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Tequila reposado', 'Licor naranja', 'Zumo de lima', 'Habanero macerado', 'Tajín']
  },
  {
    id: 'p012',
    name: 'Agua Fresca Horchata Artesanal',
    description: 'Refrescante agua de arroz con canela de Ceilán, leche condensada y vainilla pura en cubos de hielo.',
    price: 8500,
    categoryId: 'bebidas',
    spicyLevel: 0,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    ingredients: ['Arroz blanco', 'Canela en rama', 'Leche condensada', 'Vainilla natural']
  }
];
