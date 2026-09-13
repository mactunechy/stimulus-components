/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { Application } from "@hotwired/stimulus"
import Tabs from "../src/index"

let application: Application

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const render = async (values = ""): Promise<void> => {
  document.body.innerHTML = `
    <div data-controller="tabs" ${values}>
      <div data-tabs-target="tablist">
        <button data-tabs-target="tab">Account</button>
        <button data-tabs-target="tab">Password</button>
        <button data-tabs-target="tab" disabled>Disabled</button>
        <button data-tabs-target="tab">Billing</button>
      </div>
      <section data-tabs-target="panel">Account panel</section>
      <section data-tabs-target="panel">Password panel</section>
      <section data-tabs-target="panel">Disabled panel</section>
      <section data-tabs-target="panel">Billing panel</section>
    </div>
  `
  await flush()
}

const tabs = (): HTMLElement[] => Array.from(document.querySelectorAll("[data-tabs-target='tab']"))
const panels = (): HTMLElement[] => Array.from(document.querySelectorAll("[data-tabs-target='panel']"))
const press = (tab: HTMLElement, key: string): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  tab.dispatchEvent(event)
  return event
}

beforeEach(() => {
  application = Application.start()
  application.register("tabs", Tabs)
})

afterEach(() => {
  application.stop()
  document.body.innerHTML = ""
})

describe("initialization", () => {
  it("adds the tab semantics and selects the first enabled tab", async () => {
    await render()

    expect(document.querySelector("[data-tabs-target='tablist']")?.getAttribute("role")).toBe("tablist")
    expect(document.querySelector("[data-tabs-target='tablist']")?.getAttribute("aria-orientation")).toBe("horizontal")
    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual(["true", "false", "false", "false"])
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1])
    expect(panels().map((panel) => panel.hidden)).toEqual([false, true, true, true])
    expect(tabs()[0].getAttribute("aria-controls")).toBe(panels()[0].id)
    expect(panels()[0].getAttribute("aria-labelledby")).toBe(tabs()[0].id)
    expect(panels().every((panel) => panel.getAttribute("role") === "tabpanel")).toBe(true)
  })

  it("preserves the tab selected in the markup", async () => {
    document.body.innerHTML = `
      <div data-controller="tabs">
        <div data-tabs-target="tablist">
          <button data-tabs-target="tab">Account</button>
          <button data-tabs-target="tab" aria-selected="true">Password</button>
        </div>
        <section data-tabs-target="panel">Account panel</section>
        <section data-tabs-target="panel">Password panel</section>
      </div>
    `
    await flush()

    expect(tabs()[1].getAttribute("aria-selected")).toBe("true")
    expect(panels()[1].hidden).toBe(false)
  })

  it("hides every panel when all tabs are disabled", async () => {
    document.body.innerHTML = `
      <div data-controller="tabs">
        <div data-tabs-target="tablist">
          <button data-tabs-target="tab" disabled>Unavailable</button>
        </div>
        <section data-tabs-target="panel">Unavailable panel</section>
      </div>
    `
    await flush()

    expect(tabs()[0].getAttribute("aria-selected")).toBe("false")
    expect(tabs()[0].tabIndex).toBe(-1)
    expect(panels()[0].hidden).toBe(true)
  })

  it("honors explicit aria-controls links", async () => {
    document.body.innerHTML = `
      <div data-controller="tabs">
        <div data-tabs-target="tablist">
          <button id="second-tab" aria-controls="second" data-tabs-target="tab">Second</button>
          <button id="first-tab" aria-controls="first" data-tabs-target="tab">First</button>
        </div>
        <section id="first" data-tabs-target="panel">First panel</section>
        <section id="second" data-tabs-target="panel">Second panel</section>
      </div>
    `
    await flush()

    expect(panels().map((panel) => panel.hidden)).toEqual([true, false])
    expect(document.querySelector("#second")?.getAttribute("aria-labelledby")).toBe("second-tab")
  })
})

describe("selection", () => {
  it("selects a clicked tab and its panel", async () => {
    await render()

    tabs()[1].click()

    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual(["false", "true", "false", "false"])
    expect(panels().map((panel) => panel.hidden)).toEqual([true, false, true, true])
  })

  it("does not select disabled tabs", async () => {
    await render()

    tabs()[2].click()

    expect(tabs()[0].getAttribute("aria-selected")).toBe("true")
    expect(panels()[0].hidden).toBe(false)
  })
})

describe("keyboard navigation", () => {
  it("wraps through enabled horizontal tabs", async () => {
    await render()

    press(tabs()[0], "ArrowLeft")
    expect(document.activeElement).toBe(tabs()[3])
    expect(tabs()[3].getAttribute("aria-selected")).toBe("true")

    press(tabs()[3], "ArrowRight")
    expect(document.activeElement).toBe(tabs()[0])

    press(tabs()[0], "End")
    expect(document.activeElement).toBe(tabs()[3])

    press(tabs()[3], "Home")
    expect(document.activeElement).toBe(tabs()[0])
  })

  it("uses up and down arrows for vertical tabs", async () => {
    await render('data-tabs-orientation-value="vertical"')

    expect(document.querySelector("[role='tablist']")?.getAttribute("aria-orientation")).toBe("vertical")
    expect(press(tabs()[0], "ArrowRight").defaultPrevented).toBe(false)

    press(tabs()[0], "ArrowDown")
    expect(document.activeElement).toBe(tabs()[1])

    press(tabs()[1], "ArrowDown")
    expect(document.activeElement).toBe(tabs()[3])
  })

  it("moves focus without selecting in manual mode", async () => {
    await render('data-tabs-activation-value="manual"')

    press(tabs()[0], "ArrowRight")
    expect(document.activeElement).toBe(tabs()[1])
    expect(tabs()[0].getAttribute("aria-selected")).toBe("true")

    press(tabs()[1], "Enter")
    expect(tabs()[1].getAttribute("aria-selected")).toBe("true")
    expect(panels()[1].hidden).toBe(false)
  })
})

describe("dynamic targets", () => {
  it("selects a remaining tab when the active targets are removed", async () => {
    await render()
    tabs()[1].click()

    tabs()[1].remove()
    panels()[1].remove()
    await flush()

    expect(tabs()[0].getAttribute("aria-selected")).toBe("true")
    expect(panels()[0].hidden).toBe(false)
  })
})
