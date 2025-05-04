import { useState } from 'react'
import {  Mail, Phone, MapPin, Briefcase, Calendar, Edit } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Mock user data
const initialUserData = {
  name: "Louis Doe",
  email: "john.doe@example.com",
  phone: "+1 (555) 123-4567",
  address: "123 Hotel Street, Cityville, State 12345",
  position: "Hotel Manager",
  department: "Management",
  joinDate: "2020-01-15",
  bio: "Experienced hotel manager with a passion for exceptional guest experiences and team leadership.",
  avatar: "/placeholder.svg?height=100&width=100"
}

const UserProfile = () => {
  const [userData, setUserData] = useState(initialUserData)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUserData, setEditedUserData] = useState(userData)

  const handleEditProfile = () => {
    setUserData(editedUserData)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Edit Profile</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={editedUserData.name}
              onChange={(e) => setEditedUserData({ ...editedUserData, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={editedUserData.email}
              onChange={(e) => setEditedUserData({ ...editedUserData, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={editedUserData.phone}
              onChange={(e) => setEditedUserData({ ...editedUserData, phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={editedUserData.address}
              onChange={(e) => setEditedUserData({ ...editedUserData, address: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={editedUserData.position}
              onChange={(e) => setEditedUserData({ ...editedUserData, position: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={editedUserData.department}
              onChange={(e) => setEditedUserData({ ...editedUserData, department: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={editedUserData.bio}
              onChange={(e) => setEditedUserData({ ...editedUserData, bio: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button onClick={handleEditProfile}>Save Changes</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Profile</h2>
        <Button variant="outline" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" />Edit Profile</Button>
      </div>
      
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-32 w-32">
          <AvatarImage src={userData.avatar} alt={userData.name} />
          <AvatarFallback>{userData.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <h3 className="text-2xl font-semibold">{userData.name}</h3>
        <Badge variant="secondary">{userData.position}</Badge>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-gray-500" />
          <span>{userData.email}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Phone className="h-5 w-5 text-gray-500" />
          <span>{userData.phone}</span>
        </div>
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-gray-500" />
          <span>{userData.address}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Briefcase className="h-5 w-5 text-gray-500" />
          <span>{userData.department}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span>Joined on {new Date(userData.joinDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-2">Bio</h4>
        <p>{userData.bio}</p>
      </div>
    </div>
  )
}

export default UserProfile

