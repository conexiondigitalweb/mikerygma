import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
