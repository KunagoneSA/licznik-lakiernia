import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[300px] items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-zinc-100">Coś poszło nie tak</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {this.state.error?.message ?? 'Wystąpił nieoczekiwany błąd.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-amber-400"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
