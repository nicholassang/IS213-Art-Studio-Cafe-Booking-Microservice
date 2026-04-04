import { gql } from "@apollo/client";

export const GET_BOOKING_PAGE_DATA = gql`
  query GetBookingPageData {
    bookingPageData {
      activities {
        id
        name
        category
        description
        price
        duration
        image
        rating
        reviews
        level
        emoji
      }
      menu {
        id
        name
        price
        category
        imageUrl
      }
    }
  }
`;

export const GET_BOOKING_AVAILABILITY = gql`
  query GetBookingAvailability($startTime: String!, $endTime: String!, $activityId: String!) {
    bookingAvailability(startTime: $startTime, endTime: $endTime, activityId: $activityId) {
      activityId
      startTime
      endTime
      maxSlots
      bookedSlots
      remainingSlots
      isFull
    }
  }
`;

export const CREATE_BOOKING = gql`
  mutation CreateBooking($input: CreateBookingInput!) {
    createBooking(input: $input) {
      success
      message
      bookingId
      notificationQueued
      totalAmount
      errorDetail
    }
  }
`;