import React, { useEffect, useState } from "react"
import { Loader2, DollarSign } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  getRoomClassPricings,
  setRoomClassPricings,
  DURATION_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  type RoomClassPricingRequest,
  type RoomClassPricingDto,
} from "@/services/room-class-service"
import type { RoomClass } from "@/types/hotel"

// ─────────────────────────────────────────────────────────────────────────────
// Types internes
// ─────────────────────────────────────────────────────────────────────────────

interface PricingRow {
  durationType: number       // valeur entière de l'enum BookingDurationType
  durationLabel: string      // ex: "2 heures"
  price: string              // champ contrôlé (string pour l'input)
  currency: number           // 1=HTG, 2=USD
  enabled: boolean           // coché = inclus dans la grille
}

// Convertit le label renvoyé par l'API ("Hours2", "Overnight"…) en valeur entière
function durationLabelToValue(apiLabel: string): number | null {
  const map: Record<string, number> = {
    Hours1: 3, Hours2: 0, Hours3: 4, Hours4: 1,
    Hours5: 5, Hours6: 6, Hours7: 7, Hours8: 8,
    Overnight: 2, Stay: 9,
  }
  return map[apiLabel] ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

interface RoomClassPricingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomClass: RoomClass | null
  onSaved?: () => void
}

const RoomClassPricingDialog: React.FC<RoomClassPricingDialogProps> = ({
  open,
  onOpenChange,
  roomClass,
  onSaved,
}) => {
  const [rows, setRows] = useState<PricingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── Charger la grille existante quand le dialog s'ouvre ──────────────────
  useEffect(() => {
    if (!open || !roomClass) return

    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    void (async () => {
      try {
        const existing = await getRoomClassPricings(roomClass.roomClassID)

        // Construire une map durationType → ligne existante
        const existingMap = new Map<number, RoomClassPricingDto>()
        existing.forEach((p) => {
          const v = durationLabelToValue(p.durationType)
          if (v !== null) existingMap.set(v, p)
        })

        // Créer une ligne par durée possible, pré-remplie si déjà configurée
        const initialRows: PricingRow[] = DURATION_TYPE_OPTIONS.map((opt) => {
          const saved = existingMap.get(opt.value)
          return {
            durationType:  opt.value,
            durationLabel: opt.label,
            price:         saved ? String(saved.price) : "",
            currency:      saved
              ? (saved.currency === "USD" ? 2 : 1)
              : 1,
            enabled:       !!saved,
          }
        })

        setRows(initialRows)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load pricing.")
      } finally {
        setLoading(false)
      }
    })()
  }, [open, roomClass])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggle = (durationType: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.durationType === durationType ? { ...r, enabled: !r.enabled } : r
      )
    )
  }

  const handlePriceChange = (durationType: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.durationType === durationType ? { ...r, price: value } : r
      )
    )
  }

  const handleCurrencyChange = (durationType: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.durationType === durationType ? { ...r, currency: Number(value) } : r
      )
    )
  }

  const handleSubmit = async () => {
    if (!roomClass) return
    setError(null)
    setSuccessMsg(null)

    // Valider les lignes activées
    const enabledRows = rows.filter((r) => r.enabled)
    if (enabledRows.length === 0) {
      setError("Veuillez activer et configurer au moins une durée.")
      return
    }

    for (const row of enabledRows) {
      const price = parseFloat(row.price)
      if (isNaN(price) || price < 0) {
        setError(`Prix invalide pour "${row.durationLabel}". Entrez un montant valide.`)
        return
      }
    }

    const payload: RoomClassPricingRequest[] = enabledRows.map((r) => ({
      durationType: r.durationType,
      price:        parseFloat(r.price),
      currency:     r.currency,
    }))

    setSubmitting(true)
    try {
      await setRoomClassPricings(roomClass.roomClassID, payload)
      setSuccessMsg(`Grille de prix pour "${roomClass.name}" enregistrée avec succès.`)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pricing.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            Grille de prix — {roomClass?.name ?? "Catégorie"}
          </DialogTitle>
          <DialogDescription>
            Cochez les durées que vous souhaitez configurer, entrez le prix et la devise.
            Les durées non cochées seront supprimées de la grille.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMsg && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* En-têtes */}
              <div className="grid grid-cols-[1.5rem_1fr_8rem_6rem] gap-3 items-center px-1">
                <span />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Durée</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Prix</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Devise</span>
              </div>

              {/* Séparateur Horaire / Overnight / Stay */}
              {rows.map((row, idx) => {
                const isOvernight = row.durationType === 2
                const isStay      = row.durationType === 9
                const showSep     = isOvernight || isStay

                return (
                  <React.Fragment key={row.durationType}>
                    {showSep && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">
                          {isOvernight ? "Nuit & Séjour" : ""}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}

                    <div
                      className={`grid grid-cols-[1.5rem_1fr_8rem_6rem] gap-3 items-center rounded-md px-1 py-1.5 transition-colors ${
                        row.enabled ? "bg-muted/40" : "opacity-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={() => handleToggle(row.durationType)}
                        className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                        aria-label={`Activer ${row.durationLabel}`}
                      />

                      {/* Label durée */}
                      <Label
                        className="cursor-pointer text-sm font-normal"
                        onClick={() => handleToggle(row.durationType)}
                      >
                        {row.durationLabel}
                      </Label>

                      {/* Prix */}
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0"
                        value={row.price}
                        disabled={!row.enabled}
                        onChange={(e) => handlePriceChange(row.durationType, e.target.value)}
                        className="h-8 text-right text-sm"
                      />

                      {/* Devise */}
                      <Select
                        value={String(row.currency)}
                        onValueChange={(v) => handleCurrencyChange(row.durationType, v)}
                        disabled={!row.enabled}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={String(c.value)}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Fermer
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loading}>
            {submitting
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</>
              : "Enregistrer les prix"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RoomClassPricingDialog