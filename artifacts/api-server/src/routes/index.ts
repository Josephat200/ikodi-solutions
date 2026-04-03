import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import schoolsRouter from "./schools";
import studentsRouter from "./students";
import sponsorsRouter from "./sponsors";
import sponsorshipsRouter from "./sponsorships";
import paymentsRouter from "./payments";
import communicationsRouter from "./communications";
import auditRouter from "./audit";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/schools", schoolsRouter);
router.use("/students", studentsRouter);
router.use("/sponsors", sponsorsRouter);
router.use("/sponsorships", sponsorshipsRouter);
router.use("/payments", paymentsRouter);
router.use("/communications", communicationsRouter);
router.use("/audit-logs", auditRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportsRouter);

export default router;
