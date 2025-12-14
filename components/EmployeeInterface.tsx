"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingCart } from "lucide-react"
import type { Employee, Product, Transaction } from "@/lib/storage"

interface EmployeeInterfaceProps {
  employee: Employee
  products: Product[]
  onBack: () => void
  onTransaction: (transaction: Transaction) => void
  transactions: Transaction[]
  updateDailyStats: (productName: string, quantity: number) => void
  addEmployeeToMealList: (employeeName: string) => void
  onUpdateProducts?: (products: Product[]) => void
}

export default function EmployeeInterface({
  employee,
  products,
  onBack,
  onTransaction,
  transactions,
  updateDailyStats,
  addEmployeeToMealList,
  onUpdateProducts,
}: EmployeeInterfaceProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [employeeTransactions, setEmployeeTransactions] = useState<Transaction[]>([])
  const [showManualAmount, setShowManualAmount] = useState(false)
  const [manualAmount, setManualAmount] = useState("")
  const [manualDescription, setManualDescription] = useState("")
  const [isCreditMode, setIsCreditMode] = useState(false)

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  const startInactivityTimer = () => {
    // Clear existing timer if any
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    // Start new 30-second timer
    inactivityTimerRef.current = setTimeout(() => {
      onBack()
    }, 30000)
  }

  const resetInactivityTimer = () => {
    startInactivityTimer()
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Start timer when component mounts
  useEffect(() => {
    startInactivityTimer()

    // Cleanup on unmount
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [onBack])

  useEffect(() => {
    const employeeHistory = transactions
      .filter((t) => t.employeeId === employee.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100)
    setEmployeeTransactions(employeeHistory)
  }, [employee.id, transactions])

  const handleProductSelect = (product: Product) => {
    resetInactivityTimer() // Reset timer on product selection
    setSelectedProduct(product)
    setSelectedQuantity(1)
    setShowConfirmation(true)
  }

  const adjustQuantity = (delta: number) => {
    resetInactivityTimer() // Reset timer on quantity adjustment
    setSelectedQuantity((prev) => Math.max(-10, prev + delta))
  }

  const playSound = (type: "success" | "error" | "manual" | "drink") => {
    try {
      if (type === "drink") {
        const audio = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/salamisound-6649857-buegelverschluss-einer-8hdvNa7y3y6ENPtIkwqjHEJ1bWiIsL.mp3")
        audio.volume = 0.3 // Set volume to 30%
        audio.play().catch((error) => {
          console.log("[v0] Could not play drink sound:", error)
        })
        return
      }

      if (type === "success") {
        const audio = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/cash-register-kaching-376867-aPbeVRwgEL4iTic4HjSgoZIBofCs2S.mp3")
        audio.volume = 0.3 // Set volume to 30%
        audio.play().catch((error) => {
          console.log("[v0] Could not play cash register sound:", error)
        })
        return
      }

      // Keep existing Web Audio API for manual and error sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Different frequencies for different actions
      switch (type) {
        case "manual":
          // Different tone for manual amounts
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime) // A4
          oscillator.frequency.setValueAtTime(554.37, audioContext.currentTime + 0.15) // C#5
          break
        case "error":
          // Lower, warning-like sound
          oscillator.frequency.setValueAtTime(220, audioContext.currentTime) // A3
          break
      }

      oscillator.type = "sine"
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      // Fallback for browsers that don't support Web Audio API
      console.log("[v0] Audio not supported:", error)
    }
  }

  const handleConfirmedTransaction = () => {
    if (!selectedProduct) return

    resetInactivityTimer()

    if (selectedProduct.category === "getränke") {
      playSound("drink")
    } else {
      playSound("success")
    }

    const updatedProduct = {
      ...selectedProduct,
      stock: Math.max(0, selectedProduct.stock - selectedQuantity),
    }

    // Update products array with new stock
    const updatedProducts = products.map((p) => (p.id === selectedProduct.id ? updatedProduct : p))

    // Send updated products to parent component
    if (onUpdateProducts) {
      onUpdateProducts(updatedProducts)
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      price: selectedProduct.price * selectedQuantity,
      quantity: selectedQuantity,
      timestamp: new Date(),
    }

    onTransaction(transaction)

    updateDailyStats(selectedProduct.name, selectedQuantity)

    if (selectedProduct.name === "Mittagessen") {
      addEmployeeToMealList(employee.name)
    }

    setShowConfirmation(false)
    setSelectedProduct(null)
    setSelectedQuantity(1)
  }

  const handleManualAmount = () => {
    const amount = Number.parseFloat(manualAmount)
    if (isNaN(amount) || amount === 0) return

    resetInactivityTimer()

    playSound("manual")

    const finalAmount = isCreditMode ? -Math.abs(amount) : Math.abs(amount)

    const transaction: Transaction = {
      id: Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.name,
      productId: "manual",
      productName: manualDescription || (isCreditMode ? "Guthaben eingezahlt" : "Manueller Betrag"),
      price: finalAmount,
      quantity: 1,
      timestamp: new Date(),
    }

    onTransaction(transaction)

    setShowManualAmount(false)
    setManualAmount("")
    setManualDescription("")
    setIsCreditMode(false)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "süßigkeiten":
        return "🍬"
      case "getränke":
        return "🥤"
      case "snacks":
        return "🥨"
      case "essen":
        return "🍽️"
      case "sonstige":
        return "📦"
      default:
        return "🛒"
    }
  }

  const filteredProducts = products.filter((product) => {
    if (employee.hideCoffee && product.name.toLowerCase().includes("kaffee")) {
      return false
    }
    return true
  })

  const groupedProducts = filteredProducts.reduce(
    (acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = []
      }
      acc[product.category].push(product)
      return acc
    },
    {} as Record<string, Product[]>,
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={onBack} variant="outline" size="lg">
            ← Zurück zur Übersicht
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Kantine Tablet</h1>
          <div className="w-32" />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Mitarbeiter ausgewählt
            </CardTitle>
            <CardDescription>
              Eingeloggt als: <strong>{employee.name}</strong> (Aktueller Stand:
              <span className={employee.balance >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                €{employee.balance.toFixed(2)}
              </span>
              )
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Button
                onClick={() => {
                  resetInactivityTimer() // Reset timer on manual amount button click
                  setShowManualAmount(true)
                }}
                variant="outline"
                className="w-full p-4 text-lg font-semibold bg-blue-50 hover:bg-blue-100 border-blue-300"
              >
                💰 Manuellen Betrag hinzufügen
              </Button>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categoryProducts.map((product) => (
                      <Button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300 transition-colors"
                      >
                        <span className="text-3xl">{getCategoryIcon(product.category)}</span>
                        <div className="text-center">
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-lg font-bold text-green-600">€{product.price.toFixed(2)}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {showConfirmation && selectedProduct && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <Card className="w-96">
                  <CardHeader>
                    <CardTitle>Bestätigung</CardTitle>
                    <CardDescription>
                      Produkt: {selectedProduct.name} (€{selectedProduct.price.toFixed(2)} pro Stück)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adjustQuantity(-1)}
                        disabled={selectedQuantity <= -10}
                      >
                        -
                      </Button>
                      <span className="text-xl font-bold min-w-[3rem] text-center">{selectedQuantity}</span>
                      <Button variant="outline" size="sm" onClick={() => adjustQuantity(1)}>
                        +
                      </Button>
                    </div>

                    {selectedQuantity < 0 && (
                      <div className="text-sm text-orange-600 text-center">⚠️ Stornierung/Korrektur</div>
                    )}

                    <div className="text-center">
                      <div className="text-lg font-bold">
                        Gesamtbetrag:
                        <span className={selectedQuantity < 0 ? "text-red-600" : "text-green-600"}>
                          €{(selectedProduct.price * selectedQuantity).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleConfirmedTransaction} className="flex-1">
                        Bestätigen
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowConfirmation(false)
                          setSelectedProduct(null)
                        }}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {showManualAmount && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <Card className="w-96">
                  <CardHeader>
                    <CardTitle>Manueller Betrag</CardTitle>
                    <CardDescription>Bitte geben Sie den Betrag und eine Beschreibung ein</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        variant={!isCreditMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsCreditMode(false)}
                        className="flex-1"
                      >
                        💸 Schulden
                      </Button>
                      <Button
                        variant={isCreditMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsCreditMode(true)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        💰 Guthaben
                      </Button>
                    </div>

                    <Input
                      type="number"
                      placeholder={isCreditMode ? "Guthaben-Betrag (positiv)" : "Schulden-Betrag (positiv)"}
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                    />
                    <Input
                      placeholder={isCreditMode ? "z.B. Einkauf verrechnet" : "Beschreibung"}
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                    />

                    {manualAmount && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Vorschau: </span>
                        <span className={isCreditMode ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                          {isCreditMode ? "-" : "+"}€{Math.abs(Number.parseFloat(manualAmount) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={handleManualAmount} className="flex-1">
                        Hinzufügen
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowManualAmount(false)
                          setManualAmount("")
                          setManualDescription("")
                          setIsCreditMode(false)
                        }}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Letzte Transaktionen</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produkt</TableHead>
                    <TableHead>Preis</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Uhrzeit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.productName}</TableCell>
                      <TableCell>€{transaction.price.toFixed(2)}</TableCell>
                      <TableCell>{new Date(transaction.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {new Date(transaction.timestamp).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
