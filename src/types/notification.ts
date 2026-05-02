export enum NotificationType {
  BookingConfirmed = 1,
  BookingCompleted = 2,
  BookingCancelled = 3,
  System = 99,
}

export interface NotificationDto {
  notificationId: number
  hotelId: number

  recipientUserId?: string | null
  actorUserId?: string | null

  bookingId?: number | null
  roomId?: number | null
  eventAtUtc?: string | null

  type: NotificationType | string
  title: string
  message: string

  isRead: boolean
  createdAtUtc: string
  readAtUtc?: string | null
}
