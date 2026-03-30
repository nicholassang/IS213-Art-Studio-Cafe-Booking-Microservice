import apiClient from "../services/apiClient";

export async function getSlotAvailability(startTime, endTime) {
	const response = await apiClient.get("/booking/availability", {
		params: {
			start_time: startTime,
			end_time: endTime,
		},
	});

	return response.data;
}