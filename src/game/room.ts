// Floor plan of the apartment as a side-on cutaway. See docs/floor-plan.md.
//
// Units are tiles, and 1 tile = 1 foot. x grows right, y grows down from the
// top of the screen. The level is 35 tiles wide (main room 17 + kitchen 11 +
// bath 7) and 12 tall: two rows of HUD space above a 10 ft ceiling.

export const ROOM = {
  width: 35,
  height: 12,
  // y of the floor surface. Furniture heights below are measured up from here.
  floorY: 12,
  // y of the ceiling.
  ceilingY: 2,
};

export type Rect = { x: number; y: number; w: number; h: number };

export type Zone = 'main' | 'kitchen' | 'bath';

export const ZONES: Record<Zone, { x: number; w: number }> = {
  main: { x: 0, w: 17 },
  kitchen: { x: 17, w: 11 },
  bath: { x: 28, w: 7 },
};

export type PieceRole = 'platform' | 'interactable' | 'decor';

export type Piece = {
  id: string;
  name: string;
  zone: Zone;
  role: PieceRole;
  // Left edge, width and height above the floor, all in tiles.
  x: number;
  w: number;
  height: number;
  // 'solid' blocks from every side. 'oneWay' can be jumped through from below
  // and stood on, which is how open-legged tables and desks work.
  collision: 'solid' | 'oneWay';
  // Sprite filename (no extension), resolved by the sprite pipeline.
  sprite: string;
  // Real-world size and color, for the sprite artist. No brands or personal items.
  note: string;
};

// Left to right. Pieces on opposite walls of the real room are squeezed into
// one lane, so widths are scaled down where noted.
export const PIECES: Piece[] = [
  // Main room
  { id: 'bed', name: 'Queen bed', zone: 'main', role: 'interactable', x: 0, w: 4, height: 2, collision: 'solid', sprite: 'bed',
    note: 'Real 5 x 6.7 ft, low platform frame. Cream sheets, striped beige duvet, white and striped pillows. Squeezed to 4 wide.' },
  { id: 'bookshelf', name: 'Cube bookshelf', zone: 'main', role: 'interactable', x: 4, w: 3, height: 5, collision: 'solid', sprite: 'bookshelf',
    note: 'Light oak cube shelf, about 5 ft tall, books and records in the left cubes, drawer column on the right. Plant and a vase on top.' },
  { id: 'desk', name: 'Standing desk', zone: 'main', role: 'interactable', x: 7, w: 3, height: 3, collision: 'oneWay', sprite: 'desk',
    note: 'Real 4 x 2.5 ft (raised to 3 ft, it is a standing desk), light bamboo top, white legs, shelf riser with a monitor and a green lamp. Chair tucked under. Squeezed to 3 wide.' },
  { id: 'table', name: 'Dining table', zone: 'main', role: 'interactable', x: 10, w: 3, height: 2, collision: 'oneWay', sprite: 'table',
    note: 'Real 4\'4" x 2\'6", dark red-brown wood, trestle legs. Teal retro microwave at one end, coffee gear (kettle, grinder, dripper) in the middle.' },
  { id: 'record-stand', name: 'Record player stand', zone: 'main', role: 'interactable', x: 13, w: 1, height: 3, collision: 'solid', sprite: 'record-stand',
    note: 'Dark wood tray table with a turntable on top, cables underneath.' },
  { id: 'sofa-arm', name: 'Sofa armrest', zone: 'main', role: 'platform', x: 14, w: 1, height: 2, collision: 'solid', sprite: 'sofa-arm',
    note: 'Wooden mission-style arm.' },
  { id: 'sofa', name: 'Sofa', zone: 'main', role: 'interactable', x: 15, w: 2, height: 1, collision: 'solid', sprite: 'sofa',
    note: 'Real 5\'8" x 3 ft, wooden frame, red and teal geometric upholstery. Squeezed to 3 wide with the arm. A guitar hangs on the wall above.' },

  // Kitchen, reordered from the real layout so the doorway has a way up
  { id: 'tote', name: 'Tote bag and shoes', zone: 'kitchen', role: 'platform', x: 17, w: 1, height: 1, collision: 'solid', sprite: 'tote',
    note: 'Black tote bag with shoes and socks piled by the kitchen door. Doubles as the first step.' },
  { id: 'bin', name: 'Trash bin', zone: 'kitchen', role: 'interactable', x: 18, w: 1, height: 2, collision: 'solid', sprite: 'bin',
    note: 'Black step bin with a plastic bag leaning on it.' },
  { id: 'stove', name: 'Stove', zone: 'kitchen', role: 'interactable', x: 19, w: 3, height: 3, collision: 'solid', sprite: 'stove',
    note: 'Black and steel four-burner gas range. Cabinet and hood above are decor.' },
  { id: 'counter', name: 'Counter and sink', zone: 'kitchen', role: 'interactable', x: 22, w: 2, height: 3, collision: 'solid', sprite: 'counter',
    note: 'Wooden cabinets, speckled dark granite top, steel sink, dish pile. Window with a gray curtain behind.' },
  { id: 'boxes', name: 'Box stack', zone: 'kitchen', role: 'interactable', x: 24, w: 1, height: 5, collision: 'solid', sprite: 'boxes',
    note: 'Cardboard boxes and stacked storage bins with pantry food on top.' },
  { id: 'fridge', name: 'Fridge', zone: 'kitchen', role: 'interactable', x: 25, w: 2, height: 6, collision: 'solid', sprite: 'fridge',
    note: 'Stainless steel top-freezer fridge, about 5.5 ft tall, humidifier and clutter on top.' },
  { id: 'spice-rack', name: 'Side rack', zone: 'kitchen', role: 'interactable', x: 27, w: 1, height: 4, collision: 'oneWay', sprite: 'spice-rack',
    note: 'White wire rack hung on the fridge side, holding tea boxes and spices.' },

  // Bath
  { id: 'vanity', name: 'Vanity sink', zone: 'bath', role: 'interactable', x: 28, w: 2, height: 3, collision: 'solid', sprite: 'vanity',
    note: 'Wooden cabinet, white top and basin.' },
  { id: 'toilet', name: 'Toilet', zone: 'bath', role: 'interactable', x: 30, w: 2, height: 2, collision: 'solid', sprite: 'toilet',
    note: 'White toilet with tank.' },
  { id: 'tub', name: 'Tub and curtain', zone: 'bath', role: 'interactable', x: 32, w: 3, height: 2, collision: 'solid', sprite: 'tub',
    note: 'White tiled tub, long linen-colored shower curtain on a black rod.' },
];

// Purely visual wall dressing, not collision.
export type Decor = { id: string; name: string; x: number; w: number; fromHeight: number; toHeight: number; sprite: string };

export const DECOR: Decor[] = [
  { id: 'window-bed', name: 'Blinds window', x: 1, w: 2, fromHeight: 4, toHeight: 8, sprite: 'window-blinds' },
  { id: 'gallery-wall', name: 'Framed art wall', x: 14, w: 3, fromHeight: 5, toHeight: 8, sprite: 'gallery-wall' },
  { id: 'guitar', name: 'Wall guitar', x: 16, w: 1, fromHeight: 3, toHeight: 6, sprite: 'guitar' },
  { id: 'key-light', name: 'Mic and key light stand', x: 9, w: 1, fromHeight: 0, toHeight: 7, sprite: 'mic-stand' },
  { id: 'kitchen-window', name: 'Curtained window', x: 22, w: 2, fromHeight: 4, toHeight: 8, sprite: 'window-curtain' },
  { id: 'hood', name: 'Range hood and cabinet', x: 19, w: 3, fromHeight: 5, toHeight: 7, sprite: 'hood' },
  { id: 'shower-curtain', name: 'Shower curtain', x: 32, w: 3, fromHeight: 2, toHeight: 8, sprite: 'shower-curtain' },
];

// Collision rectangles for the physics, derived from PIECES so there is one
// source of truth. oneWay slabs are one tile thick at the top of the piece.
export type Solid = Rect & { oneWay: boolean; id: string };

export const SOLIDS: Solid[] = [
  ...PIECES.map((p) =>
    p.collision === 'solid'
      ? { id: p.id, x: p.x, y: ROOM.floorY - p.height, w: p.w, h: p.height, oneWay: false }
      : { id: p.id, x: p.x, y: ROOM.floorY - p.height, w: p.w, h: 1, oneWay: true },
  ),
];

// Where the player starts: on the sofa seat.
export const SPAWN = { x: 15.5, y: ROOM.floorY - 1 };
