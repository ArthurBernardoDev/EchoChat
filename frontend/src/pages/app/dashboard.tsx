import { Helmet } from "react-helmet-async";

export function Dashboard() {
    return (
        <>
          <Helmet title="Dashboard" />
          <h1 className="text-2xl font-bold text-sky-600">Dashboard</h1>
        </>
    )
  }