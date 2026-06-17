const assert = require('assert');

function getSymmetricPoints(x, y, z) {
  return [[x, y, z]]; // Mock
}

function testFill() {
  const l = { voxels: [] };
  // Create a 2x2x2 box
  for (let x = 0; x < 2; x++) {
    for (let y = 0; y < 2; y++) {
      for (let z = 0; z < 2; z++) {
        l.voxels.push({ x, y, z, color: '#ff0000' });
      }
    }
  }

  const startX = 0, startY = 0, startZ = 0;
  const targetColor = '#00ff00';
  
  const colorAt = new Map();
  for (const v of l.voxels) {
    colorAt.set(`${v.x},${v.y},${v.z}`, v.color.toLowerCase());
  }

  const startKey = `${startX},${startY},${startZ}`;
  const matchColor = colorAt.get(startKey);
  const normalTarget = targetColor.toLowerCase();

  const toRecolor = new Set();
  const queue = [];

  const startingPoints = getSymmetricPoints(startX, startY, startZ);
  for (const [px, py, pz] of startingPoints) {
    const key = `${px},${py},${pz}`;
    if (colorAt.get(key) === matchColor && !toRecolor.has(key)) {
      toRecolor.add(key);
      queue.push([px, py, pz]);
    }
  }

  const MAX_FILL = 250000;
  while (queue.length > 0 && toRecolor.size < MAX_FILL) {
    const [cx, cy, cz] = queue.shift();

    const neighbors = [
      [cx+1, cy, cz], [cx-1, cy, cz],
      [cx, cy+1, cz], [cx, cy-1, cz],
      [cx, cy, cz+1], [cx, cy, cz-1],
    ];

    for (const [nx, ny, nz] of neighbors) {
      if (ny < 0) continue;
      const key = `${nx},${ny},${nz}`;
      if (toRecolor.has(key)) continue;
      if (colorAt.get(key) === matchColor) {
        toRecolor.add(key);
        queue.push([nx, ny, nz]);
      }
    }
  }

  console.log("Recolored count:", toRecolor.size);
  assert.strictEqual(toRecolor.size, 8);
}

testFill();
