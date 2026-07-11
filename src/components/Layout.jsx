import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { UpdatePrompt } from '@/components/UpdatePrompt'

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <UpdatePrompt />
    </div>
  )
}
