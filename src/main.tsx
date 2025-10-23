import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import './index.css'
import { HomePage } from './pages/HomePage'
import { WalletProvider } from "./components/WalletProvider";
import { Layout } from "./components/Layout";
import { CreatePotPage } from "./pages/CreatePotPage";
import { PotsListPage } from "./pages/PotsListPage";
import { PotChallengePage } from "./pages/PotChallengePage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { FaucetPage } from "./pages/FaucetPage";
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "create", element: <CreatePotPage /> },
      { path: "pots", element: <PotsListPage /> },
      { path: "pots/:id", element: <PotChallengePage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
      { path: "faucet", element: <FaucetPage /> },
    ]
  },
]);
// Do not touch this code
console.log('Main.tsx - Starting app initialization');
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  console.log('Root element found, rendering app');
}
createRoot(rootElement!).render(
  <StrictMode>
    <ErrorBoundary>
      <WalletProvider>
        <RouterProvider router={router} />
      </WalletProvider>
    </ErrorBoundary>
  </StrictMode>,
)