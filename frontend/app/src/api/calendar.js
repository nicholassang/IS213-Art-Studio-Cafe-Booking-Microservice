import apiClient from "../services/apiClient";

export async function getSlotAvailability(startTime, endTime, activityId) {
	const response = await apiClient.get("/booking/availability", {
		params: {
			start_time: startTime,
			end_time: endTime,
			activity_id: activityId,
		},
	});

	return response.data;
}