module.exports = {
    intelligentReplacement,
    rstHack
};

let ldff47a = [0xEA, 0x47, 0xFF];
let ldff48a = [0xEA, 0x48, 0xFF];
let ldff49a = [0xEA, 0x49, 0xFF];
let ldh47a  = [0xE0, 0x47];
let ldh48a  = [0xE0, 0x48];
let ldh49a  = [0xE0, 0x49];
let lda     = [0x3E];
let ldaaddr = [0xFA];

let ldc47   = [0x0E, 0x47];
let ldc48   = [0x0E, 0x48];
let ldc49   = [0x0E, 0x49];

// Just here to "be complete". Not actually used in searching.
let ldca    = [0xE2];

function intelligentReplacement(data) {
    const fileSize = data.length;

    let PRG_START = 0x150;
    for (let i = PRG_START; i < fileSize; i += 1) {
        findInstructions(data, i);
    }
}

function rstHack(data) {
    console.log("RST HACK! Time to get crazy!");
    writePaletteOverload(data);
}

function findInstructions(data, addr) {
    let window = [data[addr + 0], data[addr + 1], data[addr + 2]];

    if (match(ldff47a, window) || match(ldff48a, window) || match(ldff49a, window)) {
        console.log('Found ld match @ ' + addr.toString(16));
        seekBackwardsAndFindLdA(ldff47a.length, data, addr) ||
            seekBackwardsAndFindLdAAddr(ldff47a.length, data, addr);
        return true;
    }

    if (match(ldc47, window) || match(ldc48, window) || match(ldc49, window)) {
        console.log('Found ldca match @ ' + addr.toString(16));
        seekBackwardsAndFindLdA(ldc47a.length, data, addr) ||
            seekBackwardsAndFindLdAAddr(ldc47a.length, data, addr);
        return true;
    }

    if (match(ldh47a, window) || match(ldh48a, window) || match(ldh49a, window)) {
        console.log('Found ldh match @ ' + addr.toString(16));
        window[2] = 0;
        seekBackwardsAndFindLdA(ldh47a.length, data, addr) ||
            seekBackwardsAndFindLdAAddr(ldh47a.length, data, addr);
        return true;
    }

    return false;
}

function writePaletteOverload(data) {
    data[0xF7] = 0x00;
    data[0xF8] = 0xC1;
    data[0xF9] = 0xF1;
    data[0xFA] = data[0x40]; // original vblank interrupt handler
    data[0xFB] = data[0x41];
    data[0xFC] = data[0x42];
    data[0xFD] = data[0x43];
    data[0xFE] = data[0x44];
    data[0xFF] = data[0x45];

    // Pray to God the last 2 bytes arent used
//  data[0xFD] = data[0x46];
//  data[0xFE] = data[0x47];

    // Overwriting RST interrupts

    data[0xDE] = 0xF5;
    data[0xDF] = 0xC5;
    data[0xE0] = 0xFA;
    data[0xE1] = 0xFE;
    data[0xE2] = 0xFF;

    data[0xE3] = 0xFE;
    data[0xE4] = 0x01;

    data[0xE5] = 0x28; // jr z, original_vblank
    data[0xE6] = 0xF7 - 0xE6;

    data[0xE7] = 0x3E;
    data[0xE8] = 0x01;

    data[0xE9] = 0xEA;
    data[0xEA] = 0xFE;
    data[0xEB] = 0xFF;

    data[0xEC] = 0x0E; // ld c, $47
    data[0xED] = 0x47;
    data[0xEE] = 0xF2; // ld a, [c]
    data[0xEF] = 0x2F; // cpl
    data[0xF0] = 0xE2; // ld [c], a
    data[0xF1] = 0x0C; // inc c
    data[0xF2] = 0x79; // ld a, c
    data[0xF3] = 0xFE; // cp 3
    data[0xF4] = 3 + 0x47;
    data[0xF5] = 0x20; // jr nz, 7-
    data[0xF6] = -9;

    data[0x40] = 0xC3; // jp $00E0
    data[0x41] = 0xDE;
    data[0x42] = 0x00;
}

function match(set1, set2) {
    return set1.map((e, i) => e - set2[i]).reduce((a, e) => a && e === 0, true);
}

function seekBackwardsAndFindLdA(insLength, data, addr) {

    let searchSpace = 2 + insLength;
    for(let k = insLength; k < searchSpace; k += 1) {
        let window = [data[addr - k], data[addr - (k - 1)]];

        if (window[0] === lda[0]) {

            console.log('Found ld a. Palette is: ' + window[1]);

            // Get complement (invert bits)
            data[addr - (k - 1)] = ~window[1];
        }
    }
}

function seekBackwardsAndFindLdAAddr(insLength, data, addr) {

    let searchSpace = 4 + insLength;
    for(let k = insLength; k < searchSpace; k += 1) {
        let window = [data[addr - k], data[addr - (k - 1)], data[addr - (k - 2)]];

        if (window[0] === ldaaddr[0]) {

            let romAddr = (data[addr - (k - 2)] * 0x100) + data[addr - (k - 1)];
            console.log('Found ld a, []. ROM location: ' + romAddr);

            // Invert the ROM data
            data[romAddr] = ~data[romAddr];
        }
    }
}
