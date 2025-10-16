import { useRoutes } from "react-router-dom";
import Home from "../views/home/main";
import NotFound from "../views/not-found/main";
import VerifyBadge from "../views/check-verify/main";
import RegisterCertForm from "../views/register/main";
import CreateFeatureForm from "../views/create-feature/main";
import ViewFeatures from "../views/view-features/main";

function Router() {
  const routes = [
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "*",
      element: <NotFound />,
    },
    {
      path: "/verify",
      element: <VerifyBadge />,
    },
    {
      path: "/create-feature",
      element: <CreateFeatureForm />,
    },
    {
      path: "/view-feature",
      element: <ViewFeatures />,
    },
    {
      path: "/register",
      element: <RegisterCertForm />,
    },
  ];
  return useRoutes(routes);
}

export default Router;
