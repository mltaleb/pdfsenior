import { useState, useEffect, useRef } from 'react'
import { useStore } from '@nanostores/react'
import { $pdfBytes, $fileName, setPaid } from '../stores/app-store'
import { PRICING_PLANS, createCheckoutSession } from '../lib/stripe'
import { loadFile } from '../lib/file-storage'

export default function PricingCards() {
  const pdfBytes = useStore($pdfBytes)
  const fileName = useStore($fileName)
  const [selectedPlan, setSelectedPlan] = useState('day-pass')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const previewRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (pdfBytes) return
    loadFile().then(result => {
      if (result) {
        $pdfBytes.set(result.bytes)
        $fileName.set(result.fileName)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!pdfBytes || !previewRef.current) return
    const renderPreview = async () => {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise
      const page = await doc.getPage(1)
      const viewport = page.getViewport({ scale: 0.8 })
      const canvas = previewRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    }
    renderPreview().catch(console.error)
  }, [pdfBytes])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'cancelled') {
      setError('Paiement annule. Vous pouvez reessayer.')
    }
  }, [])

  const handleContinue = async () => {
    setLoading(true)
    setError('')
    try {
      const plan = PRICING_PLANS.find(p => p.id === selectedPlan)
      if (!plan) return

      localStorage.setItem('pdfsenior_selected_plan', plan.id)
      const url = await createCheckoutSession(plan.priceId)
      if (url) {
        window.location.href = url
        return
      }
    } catch (err: any) {
      if (err?.message?.includes('not configured')) {
        setPaid(selectedPlan)
        alert('Mode demo : Paiement simule ! Vous pouvez telecharger vos fichiers.')
        window.location.href = '/editor?payment=success'
        return
      }
      setError(err?.message || 'Erreur lors du paiement. Veuillez reessayer.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    'Fusionnez, divisez et compressez vos PDF',
    'Convertissez PDF vers Word, JPG, PNG',
    'Signez et annotez vos documents',
    'Ajoutez des filigranes et pivotez les pages',
    'Convertissez des images en PDF',
    'Traitement securise dans votre navigateur',
  ]

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center justify-center gap-4 py-6 border-b border-gray-100 bg-white">
        <Step number={1} label="Document fourni" completed />
        <StepLine completed />
        <Step number={2} label="Offre selectionnee" active />
        <StepLine />
        <Step number={3} label="Paiement" />
        <StepLine />
        <Step number={4} label="Telecharger" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-10">
          Selectionnez une offre pour telecharger votre document
        </h1>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Document preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
              <div className="aspect-[3/4] bg-gray-50 rounded-xl flex items-center justify-center mb-4 overflow-hidden">
                {pdfBytes ? (
                  <canvas ref={previewRef} className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-3 bg-primary-50 rounded-xl flex items-center justify-center">
                      <span className="text-primary-500 font-bold text-sm">PDF</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">Aucun document charge</p>
                    <a href="/" className="text-sm text-primary-500 hover:underline font-medium">
                      Telecharger un fichier
                    </a>
                  </div>
                )}
              </div>
              {fileName && (
                <p className="text-sm text-gray-600 text-center truncate font-medium">{fileName}.pdf</p>
              )}
            </div>
          </div>

          {/* Right: Pricing */}
          <div className="lg:col-span-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
                {error}
              </div>
            )}

            {/* Plan options */}
            <div className="space-y-3 mb-8">
              {PRICING_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  className={`w-full flex items-center justify-between p-5 rounded-xl border-2 transition-all text-left ${
                    selectedPlan === plan.id
                      ? 'border-primary-500 bg-primary-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedPlan === plan.id ? 'border-primary-500' : 'border-gray-300'
                    }`}>
                      {selectedPlan === plan.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800 block">{plan.name}</span>
                      <span className="text-xs text-gray-500">{plan.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xl font-bold text-gray-900">{plan.price}</span>
                    {'priceSuffix' in plan && plan.priceSuffix && (
                      <span className="text-sm text-gray-500">{plan.priceSuffix}</span>
                    )}
                    {plan.recommended && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">
                        Populaire
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full btn-primary text-lg py-4 mb-8 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Redirection...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Payer et telecharger
                </>
              )}
            </button>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-6 mb-8 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Paiement securise
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                SSL 256-bit
              </span>
              <span>Stripe</span>
            </div>

            {/* Features list */}
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="text-sm font-semibold text-gray-700 mb-4">Inclus dans votre acces :</p>
              <div className="space-y-3">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ number, label, active, completed }: {
  number: number
  label: string
  active?: boolean
  completed?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        completed
          ? 'bg-primary-500 text-white'
          : active
            ? 'bg-primary-100 text-primary-600 border-2 border-primary-500'
            : 'bg-gray-200 text-gray-500'
      }`}>
        {completed ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : number}
      </div>
      <span className={`text-sm font-medium hidden md:inline ${
        active || completed ? 'text-gray-900' : 'text-gray-400'
      }`}>
        {label}
      </span>
    </div>
  )
}

function StepLine({ completed }: { completed?: boolean }) {
  return (
    <div className={`w-12 h-0.5 ${completed ? 'bg-primary-500' : 'bg-gray-200'}`} />
  )
}
