// Países, peso de aparición y nombres coherentes con cada nacionalidad.
// Para agregar un país basta con añadir una entrada aquí.

export interface PaisCfg {
  code: string;
  nombre: string;
  peso: number;
  region: 'mexico' | 'eeuu' | 'latam' | 'europa' | 'asia' | 'medioOriente' | 'otro';
  m: string[];       // nombres masculinos
  f: string[];       // nombres femeninos
  ap: string[];      // apellidos
  idioma?: 'es' | 'en';
}

const s = (t: string) => t.split(' ').map(x => x.replace(/_/g, ' '));

export const PAISES: PaisCfg[] = [
  { code: 'MX', nombre: 'México', peso: 8, region: 'mexico', idioma: 'es',
    m: s('Ángel Diego Javier Luis Miguel Carlos Jorge Raúl Alejandro Rodrigo Héctor Iván Sergio Emiliano Brandon Uriel'),
    f: s('Valentina Daniela Fernanda Ximena Camila Regina Andrea Karla Paola Mariana'),
    ap: s('Sandoval Ramírez Hernández Mendoza Vázquez Torres Cruz Ortega Rivera Morales Castillo Navarro Ibarra Salazar Cárdenas Montes Paredes Aguilar Rojas Lozano Fuentes Villalobos') },
  { code: 'US', nombre: 'Estados Unidos', peso: 14, region: 'eeuu', idioma: 'en',
    m: s('Tyler Austin Cody Dustin Brandon Marcus Jake Trevor Cole Hunter Wyatt Dalton Caleb Shane Derek Malik'),
    f: s('Ashley Megan Taylor Brooke Kayla Jessica Sierra Courtney Mallory Paige'),
    ap: s('Walker Brooks Hayes Mitchell Turner Foster Reed Coleman Barnes Sullivan Dawson Hudson Pierce Bishop Webb Holloway Gentry Navarro Whitaker Crawford Banks Rhodes') },
  { code: 'BR', nombre: 'Brasil', peso: 12, region: 'latam',
    m: s('Thiago Rafael Gabriel Lucas Mateus Rodrigo Vitor Caio Felipe Murilo Otávio Wellington Anderson Jonatas'),
    f: s('Amanda Larissa Bianca Juliana Camila Letícia Priscila Beatriz Fernanda Taís'),
    ap: s('Silva Santos Oliveira Souza Pereira Costa Cavalcanti Almeida Ribeiro Carvalho Barbosa Teixeira Moura Nogueira Araújo Duarte Fonseca Rocha Mendes Lacerda') },
  { code: 'RU', nombre: 'Rusia', peso: 9, region: 'europa',
    m: s('Aleksandr Dmitri Ivan Sergei Artem Maksim Nikolai Rustam Magomed Khamzat Timur Vladislav Kirill Denis'),
    f: s('Anastasia Olga Natalia Ekaterina Yulia Irina Svetlana Darya'),
    ap: s('Ivanov Petrov Smirnov Volkov Kuznetsov Morozov Sokolov Orlov Lebedev Zaitsev Gadzhiev Nurmagomedov Isaev Abdulaev Chimaev Kovalenko Medvedev Pavlov Romanov') },
  { code: 'GB', nombre: 'Reino Unido', peso: 6, region: 'europa', idioma: 'en',
    m: s('Callum Jack Oliver Harry Connor Liam Ryan Reece Jordan Lewis Tommy Aaron Kieran'),
    f: s('Charlotte Emily Amelia Chloe Holly Megan Jessica Lucy'),
    ap: s('Hughes Clarke Barker Pritchard Fletcher Doyle Wheeler Marsh Stanley Hartley Norris Pearce Kendrick Ellis Whitfield Burrows Gallagher Tait') },
  { code: 'IE', nombre: 'Irlanda', peso: 1.5, region: 'europa', idioma: 'en',
    m: s('Cian Seán Conor Darragh Eoin Niall Padraig Rory Fergal'),
    f: s('Aoife Niamh Ciara Saoirse Orla Siobhán'),
    ap: s('Murphy Kelly Byrne Doherty Gallagher Brennan Fitzgerald McCarthy Kavanagh Nolan Daly Keane Maguire Quinn') },
  { code: 'PL', nombre: 'Polonia', peso: 4, region: 'europa',
    m: s('Marcin Piotr Łukasz Michał Kamil Dawid Paweł Rafał Sławomir Bartosz Mateusz'),
    f: s('Karolina Aleksandra Magdalena Agnieszka Weronika Natalia Joanna'),
    ap: s('Kowalski Nowak Wiśniewski Zając Kamiński Lewandowski Wójcik Krawczyk Mazur Dudek Jabłoński Pawlak Walczak Szymański Kozłowski Błachowicz') },
  { code: 'JP', nombre: 'Japón', peso: 5, region: 'asia',
    m: s('Takeshi Kenji Hiroshi Daisuke Ryota Itsuki Shinya Naoki Kazuki Yuto Haruki Tatsuya'),
    f: s('Yui Sakura Mai Rin Hinata Misaki Ayaka Nanami'),
    ap: s('Tanaka Sato Suzuki Takahashi Watanabe Ito Yamamoto Nakamura Kobayashi Kato Yoshida Makino Hayashi Shimizu Matsumoto Inoue Kimura Fujita') },
  { code: 'KR', nombre: 'Corea del Sur', peso: 3, region: 'asia',
    m: s('Min-jun Seung-hyun Dong-wook Ji-hoon Tae-yang Hyun-woo Jae-min Sung-ho Joon-young'),
    f: s('Ji-woo Seo-yeon Min-seo Ha-eun Soo-ah Yu-jin'),
    ap: s('Kim Lee Park Choi Jung Kang Cho Yoon Jang Lim Han Shin Seo Hwang') },
  { code: 'CN', nombre: 'China', peso: 4, region: 'asia',
    m: s('Wei Jun Lei Hao Tao Feng Long Ming Kai Bo Zhen Yang'),
    f: s('Xin Yue Mei Lin Hui Jing Na Fang'),
    ap: s('Wang Li Zhang Liu Chen Yang Huang Zhao Wu Zhou Xu Sun Ma Zhu Hu Guo Teng Zhao') },
  { code: 'TH', nombre: 'Tailandia', peso: 3, region: 'asia',
    m: s('Somchai Anan Kritsada Pichai Rattana Nattapong Chaiyo Sittichai Kanok Saenchai'),
    f: s('Siriporn Ploy Mali Nok Pim Suda'),
    ap: s('Sitthichai Kiatpetch Chaiyasit Phongsri Wongsawat Srisai Boonmee Jaroensuk Saengthong Petchmanee Kongthoranee') },
  { code: 'AU', nombre: 'Australia', peso: 3, region: 'otro', idioma: 'en',
    m: s('Jackson Mitchell Lachlan Hamish Riley Blake Mason Declan Cooper Brodie'),
    f: s('Chloe Mia Isla Zoe Matilda Tahlia'),
    ap: s('Thompson Wilson Kelly Anderson Murray Hartigan Boyle Dwyer Harrison Gillies McKenzie Sutherland Whelan Cavanagh') },
  { code: 'NZ', nombre: 'Nueva Zelanda', peso: 1.5, region: 'otro', idioma: 'en',
    m: s('Tane Rawiri Hemi Aroha Manu Kiri Wiremu Tama'),
    f: s('Mia Aroha Kahu Anika Ngaio Hana'),
    ap: s('Parata Walker Tamihana Ngata Rangi Hohepa Wihongi Kereama Stewart Adesanya Whaanga Tuiasosopo') },
  { code: 'CA', nombre: 'Canadá', peso: 3, region: 'eeuu', idioma: 'en',
    m: s('Noah Ethan Liam Mathieu Étienne Gavin Tristan Colton Brayden'),
    f: s('Emma Léa Chloé Brianna Kendra Sophie'),
    ap: s('Tremblay Gagnon Roy Côté Bouchard Gauthier Morin Lavoie MacDonald Campbell Stewart Fortin Pelletier Bélanger') },
  { code: 'FR', nombre: 'Francia', peso: 3, region: 'europa',
    m: s('Mathieu Antoine Hugo Maxime Yanis Baptiste Théo Kévin Cédric Nassourdine'),
    f: s('Camille Manon Léa Inès Clara Pauline'),
    ap: s('Martin Bernard Dubois Moreau Laurent Simon Michel Garcia Lefebvre Roux Benali Diakité Fontaine Giraud Perrin') },
  { code: 'DE', nombre: 'Alemania', peso: 2.5, region: 'europa',
    m: s('Lukas Jonas Felix Tobias Florian Maximilian Jannik Sven Dominik'),
    f: s('Laura Lena Hannah Johanna Katharina Marie'),
    ap: s('Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Hoffmann Schulz Koch Richter Klein Wolf') },
  { code: 'ES', nombre: 'España', peso: 2, region: 'europa', idioma: 'es',
    m: s('Álvaro Sergio Iván Adrián Pablo Marcos Hugo Raúl Joan Ilia'),
    f: s('Lucía Paula Marta Sara Irene Alba'),
    ap: s('García Fernández López Martínez Sánchez Pérez Gómez Ruiz Díaz Moreno Navarro Torres Domínguez Gil Vega') },
  { code: 'NL', nombre: 'Países Bajos', peso: 2, region: 'europa',
    m: s('Daan Sem Thijs Jeroen Bas Ruben Niels Stijn Rico Remy'),
    f: s('Sanne Lotte Fleur Anouk Eva Femke'),
    ap: s('de_Jong Jansen de_Vries van_Dijk Bakker Visser Smit Meijer Bos Mulder Verhoeven Peters Kok Brouwer') },
  { code: 'NG', nombre: 'Nigeria', peso: 1.5, region: 'otro', idioma: 'en',
    m: s('Chukwuemeka Obinna Tunde Kelechi Emeka Ifeanyi Segun Uche Kenny Israel'),
    f: s('Chioma Ngozi Funke Amara Adaeze Zainab'),
    ap: s('Okafor Adeyemi Eze Balogun Nwosu Okonkwo Ogunleye Adebayo Obi Ibrahim Usman Onyekachi') },
  { code: 'ZA', nombre: 'Sudáfrica', peso: 1.5, region: 'otro', idioma: 'en',
    m: s('Thabo Sipho Pieter Johan Bheki Dumisani Hendrik Themba Riaan'),
    f: s('Naledi Thandi Lerato Anri Zanele Nomsa'),
    ap: s('Dlamini Nkosi Botha van_der_Merwe Mokoena Naidoo Pretorius du_Plessis Khumalo Venter Mahlangu Steyn') },
  { code: 'GE', nombre: 'Georgia', peso: 2, region: 'europa',
    m: s('Giorgi Levan Irakli Davit Nika Zurab Merab Guram Lasha'),
    f: s('Nino Tamar Ana Mariam Salome Keti'),
    ap: s('Beridze Kapanadze Maisuradze Gelashvili Lomidze Dvalishvili Khutsishvili Chkheidze Gogoladze Tsiklauri Meskhi') },
  { code: 'KZ', nombre: 'Kazajistán', peso: 2.5, region: 'asia',
    m: s('Nursultan Askar Bekzat Yerlan Dauren Zhalgas Aibek Marat Sanzhar'),
    f: s('Aigerim Dana Madina Aliya Zarina Aruzhan'),
    ap: s('Nurgaliev Seitov Zhumagulov Bekmuratov Omarov Ismailov Tulegenov Abenov Serikbayev Kassymov Rakhmonov') },
  { code: 'AR', nombre: 'Argentina', peso: 2.5, region: 'latam', idioma: 'es',
    m: s('Matías Nicolás Facundo Lautaro Agustín Franco Ezequiel Gonzalo Bautista Maximiliano'),
    f: s('Florencia Agustina Julieta Milagros Sofía Belén'),
    ap: s('González Rodríguez Gómez Fernández Díaz Álvarez Romero Acosta Benítez Medina Herrera Ledesma Sosa Maidana') },
  { code: 'CO', nombre: 'Colombia', peso: 2, region: 'latam', idioma: 'es',
    m: s('Santiago Juan_David Andrés Camilo Esteban Sebastián Yeison Brayan Jhon Mauricio'),
    f: s('Valeria Luisa Daniela Mónica Yuliana Natalia'),
    ap: s('Gutiérrez Restrepo Cardona Zapata Ospina Valencia Giraldo Betancur Quintero Arango Mosquera Rincón Palacios') },
  { code: 'PH', nombre: 'Filipinas', peso: 2, region: 'asia', idioma: 'en',
    m: s('Jericho Mark Joshua Rey Carlo Eduard Joel Arnel Jun'),
    f: s('Angelica Maricar Jasmine Rhea Czarina Mikaela'),
    ap: s('dela_Cruz Santos Reyes Bautista Villanueva Aquino Ramos Mercado Pascual Castillo Tolentino Magalong') },
  { code: 'SE', nombre: 'Suecia', peso: 1, region: 'europa',
    m: s('Erik Oskar Anton Viktor Filip Axel Gustav Nils Emil'),
    f: s('Elin Moa Ebba Linnea Saga Frida'),
    ap: s('Andersson Johansson Karlsson Nilsson Eriksson Larsson Olsson Persson Svensson Gustafsson Lindqvist Berg') },
];

export const PAIS_POR_CODIGO: Record<string, PaisCfg> = Object.fromEntries(
  PAISES.map(p => [p.code, p]),
);

// Bandera emoji a partir del código ISO-2
export function bandera(code: string): string {
  if (!code || code.length !== 2) return '🏳️';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1f1a5 + c.charCodeAt(0)),
  );
}

// Países que pueden ser sede de una empresa (además de los que ya tienen peleadores)
export const PAISES_SEDE: { code: string; nombre: string }[] = [
  ...PAISES.map(p => ({ code: p.code, nombre: p.nombre })),
  { code: 'AE', nombre: 'Emiratos Árabes Unidos' },
  { code: 'SG', nombre: 'Singapur' },
  { code: 'CZ', nombre: 'Chequia' },
].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export function nombrePais(code: string): string {
  return PAIS_POR_CODIGO[code]?.nombre
    ?? PAISES_SEDE.find(p => p.code === code)?.nombre
    ?? code;
}

export const APODOS_ES = s(
  'El_Bellako El_Toro El_Cuervo La_Pantera El_Tigre El_Chacal El_Martillo El_Ciclón El_Halcón El_Güero ' +
  'La_Fiera El_Cobra El_Relámpago El_Titán El_Lobo La_Víbora El_Gladiador El_Rayo El_Demoledor El_Zorro ' +
  'El_Tanque El_Gallo El_Diablo La_Máquina El_Chato El_Cazador El_Tornado El_Bravo',
);
export const APODOS_EN = s(
  'The_Hammer The_Predator The_Ghost Iron The_Machine Wildcat The_Viper The_Axe Thunder The_Cobra ' +
  'The_Hurricane Stone The_Reaper Lightning The_Wolf Showtime The_Surgeon The_Bull The_Hawk Blade ' +
  'The_Assassin Sledgehammer The_Cannon Sniper The_Technician',
);
