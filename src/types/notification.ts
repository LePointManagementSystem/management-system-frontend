export enum NotificationType {
  BookingCreated = 0,
  BookingCancelled = 1,
  BookingConfirmed = 2,
  BookingCompleted = 3,
  RoomAvailable = 4,
  RoomUnavailable = 5,
  StaffAction = 6,
  System = 7,
}

export interface NotificationDto {
  notificationId: number
  hotelId: number

  recipientUserId?: string | null
  actorUserId?: string | null

  bookingId?: number | null
  roomId?: number | null
  eventAtUtc?: string | null

  type: NotificationType
  title: string
  message: string

  isRead: boolean
  createdAtUtc: string
  readAtUtc?: string | null
}
