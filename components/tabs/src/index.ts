import { Controller } from "@hotwired/stimulus"

let instance = 0

export default class Tabs extends Controller {
  declare readonly tabTargets: HTMLElement[]
  declare readonly panelTargets: HTMLElement[]
  declare readonly hasTablistTarget: boolean
  declare readonly tablistTarget: HTMLElement
  declare readonly activationValue: string
  declare readonly orientationValue: string

  static targets = ["tablist", "tab", "panel"]

  static values = {
    activation: { type: String, default: "auto" },
    orientation: { type: String, default: "horizontal" },
  }

  private connected = false
  private readonly instanceId = ++instance

  initialize(): void {
    this.select = this.select.bind(this)
    this.navigate = this.navigate.bind(this)
  }

  connect(): void {
    this.connected = true
    this.refresh()
  }

  disconnect(): void {
    this.connected = false
    this.tabTargets.forEach((tab) => this.removeListeners(tab))
  }

  tabTargetConnected(tab: HTMLElement): void {
    tab.addEventListener("click", this.select)
    tab.addEventListener("keydown", this.navigate)

    if (this.connected) this.refresh()
  }

  tabTargetDisconnected(tab: HTMLElement): void {
    this.removeListeners(tab)

    if (this.connected) this.refresh()
  }

  panelTargetConnected(): void {
    if (this.connected) this.refresh()
  }

  panelTargetDisconnected(): void {
    if (this.connected) this.refresh()
  }

  select(event: Event): void {
    const tab = event.currentTarget

    if (tab instanceof HTMLElement && !this.disabled(tab)) this.activate(tab)
  }

  navigate(event: KeyboardEvent): void {
    const tab = event.currentTarget

    if (!(tab instanceof HTMLElement) || this.disabled(tab) || event.altKey || event.ctrlKey || event.metaKey) return

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      this.activate(tab)
      return
    }

    const tabs = this.tabTargets.filter((candidate) => !this.disabled(candidate))
    const current = tabs.indexOf(tab)
    const vertical = this.orientationValue === "vertical"
    let next: number

    if (event.key === "Home") next = 0
    else if (event.key === "End") next = tabs.length - 1
    else if ((!vertical && event.key === "ArrowRight") || (vertical && event.key === "ArrowDown")) next = current + 1
    else if ((!vertical && event.key === "ArrowLeft") || (vertical && event.key === "ArrowUp")) next = current - 1
    else return

    event.preventDefault()

    const nextTab = tabs[(next + tabs.length) % tabs.length]
    nextTab?.focus()

    if (this.activationValue !== "manual" && nextTab) this.activate(nextTab)
  }

  private refresh(): void {
    if (this.hasTablistTarget) {
      this.tablistTarget.setAttribute("role", "tablist")
      this.tablistTarget.setAttribute(
        "aria-orientation",
        this.orientationValue === "vertical" ? "vertical" : "horizontal",
      )
    }

    this.panelTargets.forEach((panel) => panel.setAttribute("role", "tabpanel"))

    this.tabTargets.forEach((tab, index) => {
      const panel = this.panelFor(tab, index)

      tab.setAttribute("role", "tab")

      if (!panel) return

      tab.id ||= `tabs-${this.instanceId}-tab-${index + 1}`
      panel.id ||= `tabs-${this.instanceId}-panel-${index + 1}`
      tab.setAttribute("aria-controls", panel.id)
      panel.setAttribute("aria-labelledby", tab.id)
    })

    const selected = this.tabTargets.find(
      (tab, index) => tab.getAttribute("aria-selected") === "true" && !this.disabled(tab) && this.panelFor(tab, index),
    )
    const active = selected ?? this.tabTargets.find((tab, index) => !this.disabled(tab) && this.panelFor(tab, index))

    if (active) {
      this.activate(active)
    } else {
      this.panelTargets.forEach((panel) => (panel.hidden = true))
      this.tabTargets.forEach((tab) => {
        tab.setAttribute("aria-selected", "false")
        tab.tabIndex = -1
      })
    }
  }

  private activate(active: HTMLElement): void {
    const activePanel = this.panelFor(active)

    if (!activePanel) return

    this.panelTargets.forEach((panel) => (panel.hidden = panel !== activePanel))
    this.tabTargets.forEach((tab) => {
      const selected = tab === active
      tab.setAttribute("aria-selected", String(selected))
      tab.tabIndex = selected ? 0 : -1
    })
  }

  private panelFor(tab: HTMLElement, index = this.tabTargets.indexOf(tab)): HTMLElement | undefined {
    const controls = tab.getAttribute("aria-controls")

    return (controls && this.panelTargets.find((panel) => panel.id === controls)) || this.panelTargets[index]
  }

  private disabled(tab: HTMLElement): boolean {
    return tab.getAttribute("aria-disabled") === "true" || (tab instanceof HTMLButtonElement && tab.disabled)
  }

  private removeListeners(tab: HTMLElement): void {
    tab.removeEventListener("click", this.select)
    tab.removeEventListener("keydown", this.navigate)
  }
}
