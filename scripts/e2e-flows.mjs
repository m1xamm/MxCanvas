import { readFile } from 'node:fs/promises'
import {
  approx,
  assert,
  checkBoxFollowsPointer,
  checkDraftAnchor,
  checkFramesConsistent,
  dragDistance,
  rectApprox,
} from './e2e-helpers.mjs'

const HANDLES = {
  nw: { x: 0, y: 0, cursor: 'nwse-resize', dx: -1, dy: -1 },
  n: { x: 0.5, y: 0, cursor: 'ns-resize', dx: 0, dy: -1 },
  ne: { x: 1, y: 0, cursor: 'nesw-resize', dx: 1, dy: -1 },
  e: { x: 1, y: 0.5, cursor: 'ew-resize', dx: 1, dy: 0 },
  se: { x: 1, y: 1, cursor: 'nwse-resize', dx: 1, dy: 1 },
  s: { x: 0.5, y: 1, cursor: 'ns-resize', dx: 0, dy: 1 },
  sw: { x: 0, y: 1, cursor: 'nesw-resize', dx: -1, dy: 1 },
  w: { x: 0, y: 0.5, cursor: 'ew-resize', dx: -1, dy: 0 },
}

function handlePoint(bounds, handle) {
  return {
    x: bounds.x + bounds.width * HANDLES[handle].x,
    y: bounds.y + bounds.height * HANDLES[handle].y,
  }
}

async function drawSelected(helpers, rect) {
  await helpers.drawRect(rect)
  const frame = await helpers.lastFrame()
  assert(frame.selectedBoxes.length === 1, `expected one selected node after drawing`)
  const bounds = frame.selectedBoxes[0].rect
  rectApprox(bounds, rect, 0.01, 'drawn rect')
  return bounds
}

const rectDragFlow = {
  name: 'rectangle drag shows no click flash and follows the pointer',
  async run(page, helpers) {
    const press = { x: 520, y: 420 }
    const end = { x: 760, y: 560 }
    await page.keyboard.press('KeyR')
    assert((await helpers.cursor()) === 'crosshair', 'rectangle tool cursor')
    await helpers.clearFrames()
    const drag = await helpers.pressDrag(press, end, { keys: ['Control'], steps: 24 })
    const frames = await helpers.frames()
    const drafts = frames.filter((frame) => frame.draft !== null)
    assert(drafts.length >= 5, `expected several draft frames, got ${drafts.length}`)
    for (const frame of frames) {
      const distance = dragDistance(frame.pointer, press)
      if (frame.draft === null) {
        assert(distance < 3, `draft appeared after only ${distance} px`)
      } else {
        assert(distance >= 3 - 1e-9, `draft before the threshold at ${distance} px`)
        assert(
          !(frame.draft.width === 100 && frame.draft.height === 100),
          `100x100 click rect flashed during the drag at frame ${frame.frame}`,
        )
      }
    }
    checkDraftAnchor(drafts, 'rectangle draft')
    checkFramesConsistent(frames, 'rectangle draft')
    for (let index = 1; index < drafts.length; index += 1) {
      const previous = drafts[index - 1]
      const current = drafts[index]
      approx(
        current.draft.width - previous.draft.width,
        current.pointer.x - previous.pointer.x,
        1e-6,
        `draft width jump at frame ${current.frame}`,
      )
      approx(
        current.draft.height - previous.draft.height,
        current.pointer.y - previous.pointer.y,
        1e-6,
        `draft height jump at frame ${current.frame}`,
      )
    }
    const lastDraft = drafts[drafts.length - 1]
    rectApprox(
      lastDraft.draft,
      { x: press.x, y: press.y, width: end.x - press.x, height: end.y - press.y },
      1e-6,
      'final draft',
    )
    await drag.release()
    const after = await helpers.lastFrame()
    assert(after.draft === null, 'draft stays after pointer up')
    const selection = await helpers.selection()
    assert(selection.length === 1, 'created node is selected')
    const nodes = await helpers.nodes()
    assert(nodes.length === 1, 'exactly one node was created')
    approx(nodes[0].x, press.x, 0.01, 'created node x')
    approx(nodes[0].y, press.y, 0.01, 'created node y')
    approx(nodes[0].width, end.x - press.x, 0.01, 'created node width')
    approx(nodes[0].height, end.y - press.y, 0.01, 'created node height')
  },
}

const rectClickFlow = {
  name: 'rectangle click creates a 100x100 rect at the press point',
  async run(page, helpers) {
    await page.keyboard.press('KeyR')
    await helpers.clearFrames()
    await page.mouse.move(600, 300, { steps: 2 })
    await page.mouse.down()
    await page.waitForTimeout(60)
    await page.mouse.move(601, 301)
    await page.waitForTimeout(60)
    await page.mouse.up()
    await page.waitForTimeout(40)
    const frames = await helpers.frames()
    assert(frames.length > 0, 'no frames recorded for the click')
    for (const frame of frames) {
      assert(frame.draft === null, `click flashed a ${JSON.stringify(frame.draft)} draft`)
    }
    const nodes = await helpers.nodes()
    assert(nodes.length === 1, 'click created exactly one node')
    rectApprox(nodes[0], { x: 600, y: 300, width: 100, height: 100 }, 0.01, 'click rect')
  },
}

const rectModifierFlow = {
  name: 'rectangle shift and alt modifiers',
  async run(page, helpers) {
    await helpers.drawRect({ x: 500, y: 400, width: 120, height: 70 }, { keys: ['Shift'] })
    let nodes = await helpers.nodes()
    rectApprox(nodes[0], { x: 500, y: 400, width: 120, height: 120 }, 0.01, 'shift square')
    await helpers.drawRect({ x: 400, y: 320, width: 120, height: 90 }, { keys: ['Alt'] })
    nodes = await helpers.nodes()
    const created = nodes.find((node) => node.width === 240)
    assert(created, 'alt rect with doubled width was created')
    rectApprox(created, { x: 280, y: 230, width: 240, height: 180 }, 0.01, 'alt centered rect')
  },
}

const moveMouseFlow = {
  name: 'mouse move drags from the first pixel without a threshold jump',
  async run(page, helpers) {
    const base = await drawSelected(helpers, { x: 400, y: 300, width: 160, height: 100 })
    const before = await helpers.history()
    const start = { x: 460, y: 350 }
    const end = { x: 620, y: 470 }
    await helpers.moveTo(start)
    await helpers.clearFrames()
    const drag = await helpers.pressDrag(start, end, { keys: ['Control'], steps: 20 })
    const frames = await helpers.frames()
    checkFramesConsistent(frames, 'move')
    checkBoxFollowsPointer(frames, base, start, 'move')
    await drag.release()
    const nodes = await helpers.nodes()
    approx(nodes[0].x, base.x + (end.x - start.x), 0.01, 'moved node x')
    approx(nodes[0].y, base.y + (end.y - start.y), 0.01, 'moved node y')
    const history = await helpers.history()
    assert(history.undo === before.undo + 1, `move produced ${history.undo - before.undo} commands`)
  },
}

const arrowMoveFlow = {
  name: 'arrow keys nudge and merge, shift nudges by ten',
  async run(page, helpers) {
    await drawSelected(helpers, { x: 500, y: 300, width: 120, height: 120 })
    const before = await helpers.history()
    await page.evaluate(() => document.activeElement?.blur())
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(80)
    let nodes = await helpers.nodes()
    approx(nodes[0].x, 503, 0.01, 'three arrow nudges merge into three pixels')
    let history = await helpers.history()
    assert(history.undo === before.undo + 1, `three nudges created ${history.undo - before.undo} commands`)
    await page.waitForTimeout(600)
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(80)
    nodes = await helpers.nodes()
    approx(nodes[0].y, 310, 0.01, 'shift arrow nudges ten pixels')
    history = await helpers.history()
    assert(history.undo === before.undo + 2, `shift nudge did not create a separate command`)
  },
}

const resizeHandlesFlow = {
  name: 'every resize handle tracks the pointer without a jump',
  async run(page, helpers) {
    const base = await drawSelected(helpers, { x: 400, y: 300, width: 200, height: 150 })
    for (const handle of Object.keys(HANDLES)) {
      const start = handlePoint(base, handle)
      await helpers.moveTo(start)
      assert((await helpers.cursor()) === HANDLES[handle].cursor, `${handle} cursor`)
      await helpers.clearFrames()
      const delta = { x: HANDLES[handle].dx * 20, y: HANDLES[handle].dy * 20 }
      const drag = await helpers.pressDrag(start, { x: start.x + delta.x, y: start.y + delta.y }, {
        keys: ['Control'],
        steps: 10,
      })
      const frames = await helpers.frames()
      checkFramesConsistent(frames, `resize ${handle}`)
      for (const frame of frames) {
        const box = frame.selectedBoxes[0]?.rect ?? null
        if (!box || !frame.pointer) continue
        const tracked = handlePoint(box, handle)
        approx(tracked.x, frame.pointer.x, 0.75, `resize ${handle}: frame ${frame.frame} handle x`)
        approx(tracked.y, frame.pointer.y, 0.75, `resize ${handle}: frame ${frame.frame} handle y`)
      }
      await drag.release()
      const after = await helpers.lastFrame()
      const box = after.selectedBoxes[0].rect
      approx(box.width, base.width + Math.abs(delta.x), 0.01, `${handle} width`)
      approx(box.height, base.height + Math.abs(delta.y), 0.01, `${handle} height`)
      if (delta.x < 0) approx(box.x, base.x + delta.x, 0.01, `${handle} x`)
      if (delta.y < 0) approx(box.y, base.y + delta.y, 0.01, `${handle} y`)
      await page.keyboard.press('Control+KeyZ')
      await page.waitForTimeout(60)
    }
  },
}

const resizeModifiersFlow = {
  name: 'resize shift keeps proportions and alt grows from the center',
  async run(page, helpers) {
    const base = await drawSelected(helpers, { x: 400, y: 300, width: 200, height: 150 })
    const se = handlePoint(base, 'se')
    const proportionate = await helpers.pressDrag(se, { x: se.x + 60, y: se.y + 10 }, {
      keys: ['Control', 'Shift'],
      steps: 10,
    })
    const proportionalFrames = await helpers.frames()
    checkFramesConsistent(proportionalFrames, 'resize shift')
    await proportionate.release()
    let box = (await helpers.lastFrame()).selectedBoxes[0].rect
    rectApprox(box, { x: 400, y: 300, width: 260, height: 195 }, 0.5, 'proportional resize')
    await page.keyboard.press('Control+KeyZ')
    await page.waitForTimeout(60)
    const centered = await helpers.pressDrag(se, { x: se.x + 60, y: se.y + 30 }, {
      keys: ['Control', 'Alt'],
      steps: 10,
    })
    const centeredFrames = await helpers.frames()
    checkFramesConsistent(centeredFrames, 'resize alt')
    await centered.release()
    box = (await helpers.lastFrame()).selectedBoxes[0].rect
    rectApprox(box, { x: 340, y: 270, width: 320, height: 210 }, 0.5, 'centered resize')
  },
}

const marqueeFlow = {
  name: 'marquee selects the nodes it covers',
  async run(page, helpers) {
    await helpers.drawRect({ x: 350, y: 250, width: 100, height: 100 })
    await helpers.drawRect({ x: 600, y: 250, width: 100, height: 100 })
    await helpers.clickCanvas({ x: 900, y: 650 })
    await helpers.clearFrames()
    const start = { x: 320, y: 220 }
    const end = { x: 760, y: 400 }
    const drag = await helpers.pressDrag(start, end, { steps: 20 })
    const frames = await helpers.frames()
    const marquees = frames.filter((frame) => frame.marquee !== null)
    assert(marquees.length >= 5, `expected marquee frames, got ${marquees.length}`)
    for (const frame of marquees) {
      const rect = frame.marquee
      approx(rect.x, Math.min(start.x, frame.pointer.x), 1e-6, `marquee x at frame ${frame.frame}`)
      approx(rect.y, Math.min(start.y, frame.pointer.y), 1e-6, `marquee y at frame ${frame.frame}`)
      approx(
        rect.width,
        Math.abs(frame.pointer.x - start.x),
        1e-6,
        `marquee width at frame ${frame.frame}`,
      )
      approx(
        rect.height,
        Math.abs(frame.pointer.y - start.y),
        1e-6,
        `marquee height at frame ${frame.frame}`,
      )
    }
    await drag.release()
    const after = await helpers.lastFrame()
    assert(after.marquee === null, 'marquee stays after pointer up')
    const selection = await helpers.selection()
    assert(selection.length === 2, `marquee selected ${selection.length} nodes`)
  },
}

const multiMoveFlow = {
  name: 'multi selection moves by one shared delta',
  async run(page, helpers) {
    await helpers.drawRect({ x: 350, y: 250, width: 100, height: 100 })
    await helpers.drawRect({ x: 650, y: 250, width: 100, height: 100 })
    const marquee = await helpers.pressDrag({ x: 320, y: 220 }, { x: 780, y: 400 }, { steps: 12 })
    await marquee.release()
    const baseFrames = await helpers.frames(20)
    const base = baseFrames[baseFrames.length - 1].selectedBoxes.map((entry) => entry.rect)
    assert(base.length === 2, 'marquee selected two nodes for the move')
    const start = { x: 400, y: 300 }
    const end = { x: 480, y: 360 }
    await helpers.moveTo(start)
    await helpers.clearFrames()
    const drag = await helpers.pressDrag(start, end, { keys: ['Control'], steps: 16 })
    const frames = await helpers.frames()
    checkFramesConsistent(frames, 'multi move')
    for (const frame of frames) {
      if (!frame.pointer) continue
      assert(frame.selectedBoxes.length === 2, `multi move frame ${frame.frame} lost a box`)
      for (const [index, entry] of frame.selectedBoxes.entries()) {
        approx(
          entry.rect.x - base[index].x,
          frame.pointer.x - start.x,
          0.75,
          `multi box ${index} x at frame ${frame.frame}`,
        )
        approx(
          entry.rect.y - base[index].y,
          frame.pointer.y - start.y,
          0.75,
          `multi box ${index} y at frame ${frame.frame}`,
        )
      }
    }
    await drag.release()
    const nodes = await helpers.nodes()
    assert(nodes.length === 2, 'multi move kept both nodes')
    const history = await helpers.history()
    assert(history.undo === 3, `multi move produced ${history.undo} commands`)
  },
}

const undoRedoFlow = {
  name: 'undo and redo restore the document',
  async run(page, helpers) {
    await helpers.drawRect({ x: 400, y: 300, width: 100, height: 100 })
    await helpers.drawRect({ x: 600, y: 400, width: 100, height: 100 })
    let history = await helpers.history()
    assert(history.undo === 2, 'two draws produced two commands')
    await page.keyboard.press('Control+KeyZ')
    await page.waitForTimeout(60)
    assert((await helpers.nodes()).length === 1, 'first undo removed the last node')
    history = await helpers.history()
    assert(history.redo === 1, 'undo filled the redo stack')
    await page.keyboard.press('Control+KeyZ')
    await page.waitForTimeout(60)
    assert((await helpers.nodes()).length === 0, 'second undo removed the first node')
    await page.keyboard.press('Control+Shift+KeyZ')
    await page.waitForTimeout(60)
    assert((await helpers.nodes()).length === 1, 'redo restored the first node')
    await page.keyboard.press('Control+KeyY')
    await page.waitForTimeout(60)
    assert((await helpers.nodes()).length === 2, 'alternate redo restored the second node')
  },
}

const deleteFlow = {
  name: 'delete removes the selection and undo restores it',
  async run(page, helpers) {
    await drawSelected(helpers, { x: 500, y: 300, width: 120, height: 120 })
    await page.keyboard.press('Delete')
    await page.waitForTimeout(60)
    assert((await helpers.nodes()).length === 0, 'delete removed the node')
    assert((await helpers.selection()).length === 0, 'delete cleared the selection')
    await page.keyboard.press('Control+KeyZ')
    await page.waitForTimeout(60)
    assert((await helpers.nodes()).length === 1, 'undo restored the node')
  },
}

const layerRenameFlow = {
  name: 'layer rename commits on enter and cancels on escape',
  async run(page, helpers) {
    await helpers.drawRect({ x: 400, y: 300, width: 100, height: 100 })
    await helpers.drawRect({ x: 600, y: 400, width: 100, height: 100 })
    const name = page.locator('.layer-row__name').first()
    await name.dblclick()
    const input = page.locator('.layer-row__input')
    await input.waitFor()
    await input.fill('Карточка')
    await input.press('Enter')
    await page.waitForTimeout(60)
    assert((await helpers.findNode('Карточка')) !== null, 'rename committed the new name')
    let history = await helpers.history()
    assert(history.undo === 3, `rename produced ${history.undo} commands`)
    await page.locator('.layer-row__name').first().dblclick()
    await page.locator('.layer-row__input').waitFor()
    await page.locator('.layer-row__input').fill('Временное')
    await page.locator('.layer-row__input').press('Escape')
    await page.waitForTimeout(60)
    assert((await helpers.findNode('Карточка')) !== null, 'escape kept the committed name')
    assert((await helpers.findNode('Временное')) === null, 'escape did not commit the draft name')
    history = await helpers.history()
    assert(history.undo === 3, 'escape added a command')
  },
}

const designFieldsFlow = {
  name: 'design fields commit on enter, revert on escape and scrub',
  async run(page, helpers) {
    await drawSelected(helpers, { x: 400, y: 300, width: 160, height: 120 })
    const xField = page.getByLabel('X', { exact: true })
    await xField.click()
    await xField.fill('250')
    await xField.press('Enter')
    await page.waitForTimeout(60)
    let nodes = await helpers.nodes()
    approx(nodes[0].x, 250, 0.01, 'typed x value')
    const activeTag = await page.evaluate(() => document.activeElement?.tagName ?? '')
    assert(activeTag !== 'INPUT', 'enter returned the focus to the canvas')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(60)
    nodes = await helpers.nodes()
    approx(nodes[0].x, 251, 0.01, 'hotkey works after the field commit')
    await xField.click()
    await xField.fill('999')
    await xField.press('Escape')
    await page.waitForTimeout(60)
    nodes = await helpers.nodes()
    approx(nodes[0].x, 251, 0.01, 'escape reverted the typed value')
    const label = page.locator('label.field', { has: page.getByLabel('X', { exact: true }) }).locator('.field__label')
    const box = await label.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(60)
    nodes = await helpers.nodes()
    approx(nodes[0].x, 261, 0.01, 'scrubbed x value')
    const widthField = page.getByLabel('Ш', { exact: true })
    await widthField.click()
    await widthField.fill('300')
    await widthField.press('Enter')
    await page.waitForTimeout(60)
    nodes = await helpers.nodes()
    approx(nodes[0].width, 300, 0.01, 'typed width value')
  },
}

const paintFlow = {
  name: 'fill, stroke and shadow edits reach the document',
  async run(page, helpers) {
    await drawSelected(helpers, { x: 400, y: 300, width: 120, height: 120 })
    const hex = page.locator('.paint-row .field__input').first()
    await hex.click()
    await hex.fill('FF5722')
    await hex.press('Enter')
    await page.getByLabel('Добавить заливку').click()
    await page.getByLabel('Добавить обводку').click()
    const weight = page.getByLabel('Толщина обводки')
    await weight.click()
    await weight.fill('8')
    await weight.press('Enter')
    await page.getByLabel('Добавить эффект').click()
    const blur = page.getByLabel('Размытие')
    await blur.click()
    await blur.fill('12')
    await blur.press('Enter')
    await page.waitForTimeout(80)
    const node = (await helpers.nodes())[0]
    assert(node.fills === 2, `expected two fills, got ${node.fills}`)
    assert(node.strokes === 1, `expected one stroke, got ${node.strokes}`)
    approx(node.strokeWeight, 8, 0.01, 'stroke weight')
    assert(node.effects === 1, `expected one effect, got ${node.effects}`)
    const history = await helpers.history()
    assert(history.undo >= 5, `paint edits produced ${history.undo} commands`)
  },
}

const zoomFlow = {
  name: 'wheel and menu zoom anchor at the cursor',
  async run(page, helpers) {
    const cursor = { x: 700, y: 450 }
    await page.mouse.move(cursor.x, cursor.y)
    await page.mouse.wheel(0, 40)
    await page.waitForTimeout(80)
    const beforeFrame = await helpers.lastFrame()
    assert(beforeFrame !== null, 'no frames were recorded')
    const before = beforeFrame.viewport
    const worldBefore = {
      x: (cursor.x - before.x) / before.zoom,
      y: (cursor.y - before.y) / before.zoom,
    }
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, -120)
    await page.keyboard.up('Control')
    await page.waitForTimeout(80)
    const zoomed = (await helpers.lastFrame()).viewport
    assert(zoomed.zoom > before.zoom, 'ctrl+wheel zoomed in')
    approx((cursor.x - zoomed.x) / zoomed.zoom, worldBefore.x, 1e-6, 'zoom anchor x')
    approx((cursor.y - zoomed.y) / zoomed.zoom, worldBefore.y, 1e-6, 'zoom anchor y')
    await page.mouse.wheel(0, 120)
    await page.waitForTimeout(80)
    const panned = (await helpers.lastFrame()).viewport
    approx(panned.zoom, zoomed.zoom, 1e-9, 'plain wheel keeps the zoom')
    approx(panned.y, zoomed.y - 120, 0.01, 'plain wheel pans vertically')
    await page.locator('.zoom-menu__button').click()
    await page.locator('.popup.is-open').waitFor()
    await page.getByText('Увеличить', { exact: true }).click()
    await page.waitForTimeout(80)
    const menuZoom = (await helpers.lastFrame()).viewport
    approx(menuZoom.zoom, panned.zoom * 2, 1e-6, 'menu zoom in doubles the zoom')
  },
}

const panFlow = {
  name: 'space and middle mouse pan the canvas',
  async run(page, helpers) {
    assert((await helpers.cursor()) === 'default', 'move tool cursor')
    await page.keyboard.down('Space')
    await page.waitForTimeout(60)
    assert((await helpers.cursor()) === 'grab', 'space shows the grab cursor')
    const start = { x: 700, y: 450 }
    await page.mouse.move(start.x, start.y)
    await page.waitForTimeout(80)
    const beforePan = (await helpers.lastFrame()).viewport
    const drag = await helpers.pressDrag(start, { x: 800, y: 500 }, { steps: 10 })
    assert((await helpers.cursor()) === 'grabbing', 'space drag shows the grabbing cursor')
    await page.waitForTimeout(120)
    const frames = await helpers.frames()
    assert(frames.length > 0, 'space pan records frames')
    const last = frames[frames.length - 1].viewport
    approx(last.x - beforePan.x, 100, 0.01, 'space pan x')
    approx(last.y - beforePan.y, 50, 0.01, 'space pan y')
    await drag.release()
    assert((await helpers.cursor()) === 'grab', 'grab cursor returns after the pan')
    await page.keyboard.up('Space')
    await page.waitForTimeout(60)
    assert((await helpers.cursor()) === 'default', 'cursor returns after space is released')
    const before = (await helpers.lastFrame()).viewport
    await page.mouse.move(700, 450)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(650, 470, { steps: 6 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(120)
    const after = (await helpers.lastFrame()).viewport
    approx(after.x - before.x, -50, 0.01, 'middle mouse pan x')
    approx(after.y - before.y, 20, 0.01, 'middle mouse pan y')
  },
}

const fileSaveOpenFlow = {
  query: 'fallback=1',
  name: 'fallback save, open and drop restore the project file',
  async run(page, helpers) {
    await helpers.drawRect({ x: 460, y: 320, width: 220, height: 150 })
    await page.locator('.file-name').dblclick()
    const nameInput = page.locator('.file-name__input')
    await nameInput.fill('Stage file')
    await nameInput.press('Enter')
    const downloadPromise = page.waitForEvent('download')
    await page.keyboard.press('Control+KeyS')
    const download = await downloadPromise
    assert(
      download.suggestedFilename() === 'Stage file.mxc',
      `saved file is named ${download.suggestedFilename()}`,
    )
    const path = await download.path()
    assert(path !== null, 'saved download has a path')
    const content = await readFile(path, 'utf8')
    await page.keyboard.press('Control+KeyN')
    await page.waitForTimeout(120)
    assert((await helpers.nodes()).length === 0, 'new file cleared the document')
    assert(
      (await page.locator('.dialog-card').count()) === 0,
      'clean project skips the unsaved dialog',
    )
    const chooserPromise = page.waitForEvent('filechooser')
    await page.keyboard.press('Control+KeyO')
    const chooser = await chooserPromise
    await chooser.setFiles(path)
    await page.waitForTimeout(200)
    assert((await helpers.nodes()).length === 1, 'opened file restored the node')
    assert(
      (await page.locator('.file-name').textContent()) === 'Stage file',
      'opened file restored the document name',
    )
    await page.keyboard.press('Control+KeyN')
    await page.waitForTimeout(120)
    assert(
      (await page.locator('.dialog-card').count()) === 0,
      'opened project is clean',
    )
    await page.evaluate(
      ({ name, text }) => {
        const transfer = new DataTransfer()
        transfer.items.add(new File([text], name, { type: 'application/json' }))
        window.dispatchEvent(
          new DragEvent('dragover', { dataTransfer: transfer, bubbles: true, cancelable: true }),
        )
        window.dispatchEvent(
          new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }),
        )
      },
      { name: download.suggestedFilename(), text: content },
    )
    await page.waitForTimeout(200)
    assert((await helpers.nodes()).length === 1, 'dropped file restored the node')
    assert(
      (await page.locator('.file-name').textContent()) === 'Stage file',
      'dropped file restored the document name',
    )
  },
}

const unsavedDialogFlow = {
  query: 'fallback=1',
  name: 'unsaved changes dialog saves, discards or cancels',
  async run(page, helpers) {
    await helpers.drawRect({ x: 500, y: 340, width: 180, height: 120 })
    await page.keyboard.press('Control+KeyN')
    await page.getByRole('alertdialog').waitFor()
    assert(
      (await page.getByText('Сохранить изменения?', { exact: true }).count()) === 1,
      'unsaved dialog is shown for a dirty project',
    )
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
    const download = await downloadPromise
    assert(
      download.suggestedFilename() === 'Без названия.mxc',
      `untitled fallback save is named ${download.suggestedFilename()}`,
    )
    await page.waitForTimeout(150)
    assert((await helpers.nodes()).length === 0, 'save then continue created a new file')
    await helpers.drawRect({ x: 520, y: 360, width: 180, height: 120 })
    await page.keyboard.press('Control+KeyN')
    await page.getByRole('alertdialog').waitFor()
    await page.getByRole('button', { name: 'Отмена', exact: true }).click()
    await page.waitForTimeout(100)
    assert((await helpers.nodes()).length === 1, 'cancel kept the document')
    await page.keyboard.press('Control+KeyN')
    await page.getByRole('alertdialog').waitFor()
    await page.getByRole('button', { name: 'Не сохранять', exact: true }).click()
    await page.waitForTimeout(100)
    assert((await helpers.nodes()).length === 0, 'discard created a new file')
    assert(
      (await page.locator('.file-name').textContent()) === 'Без названия',
      'new file name was reset',
    )
  },
}

const autosaveFlow = {
  autosave: true,
  name: 'autosave restores the document and name after reload',
  async run(page, helpers) {
    await helpers.drawRect({ x: 480, y: 360, width: 240, height: 160 })
    await page.locator('.file-name').dblclick()
    const nameInput = page.locator('.file-name__input')
    await nameInput.fill('Autosaved file')
    await nameInput.press('Enter')
    await page.waitForTimeout(1300)
    assert((await helpers.nodes()).length === 1, 'one node before reload')
    await page.waitForFunction(
      () => document.querySelector('.file-save-state')?.textContent === 'Сохранено',
      null,
      { timeout: 5000 },
    )
    await page.reload()
    await page.locator('.app-shell').waitFor()
    await page.waitForTimeout(300)
    assert((await helpers.nodes()).length === 1, 'node restored after reload')
    assert(
      (await page.locator('.file-name').textContent()) === 'Autosaved file',
      'document name restored after reload',
    )
    assert(
      (await page.locator('.file-save-state').textContent()) === 'Сохранено',
      'restored project is marked saved',
    )
    assert((await page.title()).startsWith('Autosaved file'), 'tab title carries the name')
  },
}

export const flows = [
  rectDragFlow,
  rectClickFlow,
  rectModifierFlow,
  moveMouseFlow,
  arrowMoveFlow,
  resizeHandlesFlow,
  resizeModifiersFlow,
  marqueeFlow,
  multiMoveFlow,
  undoRedoFlow,
  deleteFlow,
  layerRenameFlow,
  designFieldsFlow,
  paintFlow,
  zoomFlow,
  panFlow,
  fileSaveOpenFlow,
  unsavedDialogFlow,
  autosaveFlow,
]
