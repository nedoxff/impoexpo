import ColumnSteps from "@/components/external/ColumnStep";
import SelectSourceCard from "@/components/wizard/SelectSourceCard";
import { useAuthStore } from "@/stores/auth";
import { useSourceCardStore } from "@/stores/select-source-card";
import { TransferWizardStage, useTransferWizardStore } from "@/stores/wizard";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";

const AnimatedCard = motion.create(Card);

export default function TransferWizardPage() {
	const navigate = useNavigate();
	const { stage, setStage, reset: resetWizard } = useTransferWizardStore();
	const { reset: resetSourceCard } = useSourceCardStore();

	const resetAll = () => {
		resetWizard();
		resetSourceCard();
	};

	const getStageWidget = () => {
		switch (stage) {
			case TransferWizardStage.SELECT_SOURCE:
				return <SelectSourceCard />;
		}
	};

	return (
		<div className="flex flex-row items-center justify-start w-screen h-screen gap-2 p-6">
			<AnimatedCard
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="h-full flex-[1] p-2"
			>
				<CardHeader className="flex flex-row gap-3 pl-4 font-medium text-large">
					<Button
						onPress={() => {
							resetAll();
							navigate("/");
						}}
						variant="faded"
						isIconOnly
						startContent={<Icon icon="mdi:arrow-left" />}
					/>
					новый перенос данных
				</CardHeader>
				<CardBody>
					<ColumnSteps
						steps={[
							{
								title: "выбор источников",
								description: "откуда и куда переносим",
							},
							{ title: "форматирование", description: "как переносим?" },
							{ title: "перенесение", description: "where the magic happens" },
							{ title: "готово!" },
						]}
					/>
				</CardBody>
			</AnimatedCard>
			<motion.div
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex justify-center items-center flex-[3] h-full"
			>
				{getStageWidget()}
			</motion.div>
		</div>
	);
}
